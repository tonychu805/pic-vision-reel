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
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  return response
}

export const config = {
  matcher: ['/', '/login', '/signup', '/consent', '/account', '/auth/callback', '/:slug/:code'],
}
