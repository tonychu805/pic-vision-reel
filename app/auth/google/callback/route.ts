import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createGoTrueClient } from '@/lib/supabaseServer'
import { AUTH0_ID_TOKEN_COOKIE, AUTH0_REFRESH_TOKEN_COOKIE } from '@/lib/auth0'
import { finishPlayerSignIn } from '@/lib/finishSignIn'
import { GOOGLE_STATE_COOKIE, encodeState, readState } from '@/lib/googleSignIn'

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
  // The duplicate of a return that already signed the player in.
  if (signIn.done) {
    const { data: { user } } = await (await createGoTrueClient()).auth.getUser()
    if (user) return NextResponse.redirect(`${origin}${next}`)
  }
  if (!code) return fail('missing_code', { googleError: url.searchParams.get('error') })
  const started = Date.now()

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
  const tokenMs = Date.now() - started

  const supabase = await createGoTrueClient()
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: signIn.nonce })
  if (error || !data.user) return fail('supabase_sign_in_failed', { code: error?.code, status: error?.status })
  const signInMs = Date.now() - started - tokenMs

  await finishPlayerSignIn(supabase, data.user, signIn)
  console.log('google-callback: timing', { tokenMs, signInMs, finishMs: Date.now() - started - tokenMs - signInMs })
  const response = NextResponse.redirect(`${origin}${next}`)
  response.cookies.set(GOOGLE_STATE_COOKIE, encodeState({ ...signIn, done: true }), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/auth/google', maxAge: 60,
  })
  // A LINE session left in this browser would otherwise win over the new
  // Google one (lib/supabaseServer.ts reads the LINE cookie first).
  response.cookies.delete(AUTH0_ID_TOKEN_COOKIE)
  response.cookies.delete(AUTH0_REFRESH_TOKEN_COOKIE)
  return response
}
