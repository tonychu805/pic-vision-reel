// Refreshes a player's session and re-persists it to cookies on every
// request to an auth-relevant route. Without this, a Server Component
// render (e.g. app/[slug]/[code]/page.tsx's getUser() call) can refresh an
// expired access token in memory well enough to serve that one request,
// but can't write the new cookie back (see lib/supabaseServer.ts's own
// setAll() caveat) -- so a returning player's browser keeps sending an
// already-rotated refresh token, risking a silent logout on the next
// visit. This is the standard Supabase/Next.js App Router fix.
//
// Scoped to routes that actually read or care about auth state -- not
// app/r/[shareId], which is public and unauthenticated, or static assets --
// so public reel viewers don't pay for an extra GoTrue round trip.
//
// A LINE (Auth0) session needs the equivalent handled separately below --
// it was never a GoTrue session, so supabase.auth.getUser() above does
// nothing for it. Auth0's own id token is just as short-lived as
// GoTrue's access token, and without this same refresh-and-repersist
// treatment a LINE player would face the identical silent-logout risk
// this whole file exists to close for Google/email.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH0_ID_TOKEN_COOKIE, AUTH0_REFRESH_TOKEN_COOKIE, exchangeAuth0Token } from './lib/auth0'

const AUTH0_REFRESH_MARGIN_MS = 5 * 60 * 1000

function auth0TokenExpiresAt(idToken: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

async function refreshAuth0Session(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const idToken = request.cookies.get(AUTH0_ID_TOKEN_COOKIE)?.value
  const refreshToken = request.cookies.get(AUTH0_REFRESH_TOKEN_COOKIE)?.value
  if (!idToken || !refreshToken) return response

  const expiresAt = auth0TokenExpiresAt(idToken)
  if (expiresAt !== null && expiresAt - Date.now() > AUTH0_REFRESH_MARGIN_MS) return response

  const tokens = await exchangeAuth0Token({ grant_type: 'refresh_token', refresh_token: refreshToken })
  if (!tokens) return response

  response.cookies.set(AUTH0_ID_TOKEN_COOKIE, tokens.id_token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: tokens.expires_in,
  })
  if (tokens.refresh_token) {
    response.cookies.set(AUTH0_REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getUser()
  response = await refreshAuth0Session(request, response)

  return response
}

export const config = {
  matcher: ['/', '/login', '/signup', '/consent', '/account', '/auth/callback', '/:slug/:code'],
}
