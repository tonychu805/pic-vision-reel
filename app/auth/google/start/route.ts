import { NextResponse } from 'next/server'
import { GOOGLE_STATE_COOKIE, encodeState, googleAuthUrl, randomToken, safeNext, sha256Hex } from '@/lib/googleSignIn'

// Starts Google sign-in on our own address (lib/googleSignIn.ts). The
// sign-up boxes travel in an httpOnly cookie with the state, not in the URL.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const next = safeNext(url.searchParams.get('next'))
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID
  if (!clientId) {
    console.error('google-start: GOOGLE_LOGIN_CLIENT_ID is not set')
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&auth_error=1`)
  }

  const signIn = {
    state: randomToken(),
    nonce: randomToken(),
    next,
    consent: url.searchParams.get('consent') === '1',
    promo: url.searchParams.get('promo') === '1',
  }
  const response = NextResponse.redirect(googleAuthUrl({
    clientId,
    redirectUri: `${origin}/auth/google/callback`,
    state: signIn.state,
    nonceHash: await sha256Hex(signIn.nonce),
    selectAccount: url.searchParams.get('mode') === 'signup',
  }))
  response.cookies.set(GOOGLE_STATE_COOKIE, encodeState(signIn), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/auth/google', maxAge: 600,
  })
  return response
}
