import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { finishPlayerSignIn } from '@/lib/finishSignIn'
import { GOOGLE_STATE_COOKIE, readState } from '@/lib/googleSignIn'

// Google sends the player back here (lib/googleSignIn.ts). The code is
// exchanged server-side (it needs the client secret) and the ID token goes to
// Supabase, which signs the player in to the same account as before: Google
// identities are matched by Google's own account id.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const cookieStore = await cookies()
  const signIn = readState(cookieStore.get(GOOGLE_STATE_COOKIE)?.value, url.searchParams.get('state'))
  const next = signIn?.next ?? '/'

  // Log only the failure category, never the code, token or player.
  const fail = (reason: string, detail?: unknown) => {
    console.error('google-callback:', reason, detail ?? '')
    const response = NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&auth_error=1`)
    response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/auth/google', maxAge: 0 })
    return response
  }

  const code = url.searchParams.get('code')
  if (!signIn) return fail('state_mismatch')
  if (!code) return fail('missing_code', { googleError: url.searchParams.get('error') })

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_LOGIN_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_LOGIN_CLIENT_SECRET ?? '',
      redirect_uri: `${origin}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenResponse.ok) return fail('token_exchange_failed', { status: tokenResponse.status })
  const { id_token: idToken } = (await tokenResponse.json()) as { id_token?: string }
  if (!idToken) return fail('no_id_token')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: signIn.nonce })
  if (error || !data.user) return fail('supabase_sign_in_failed', { code: error?.code, status: error?.status })

  await finishPlayerSignIn(supabase, data.user, signIn)
  const response = NextResponse.redirect(`${origin}${next}`)
  response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/auth/google', maxAge: 0 })
  return response
}
