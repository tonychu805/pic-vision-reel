// OAuth code-exchange landing spot for signInWithOAuth({ provider: 'line' | 'google' }),
// called with redirectTo pointing here. The only genuinely new ROUTE this
// feature adds -- everything else is UI on the existing /[slug]/[code] page.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { ensurePlayer, recordSignupConsent } from '@/lib/player'
import { clientIp } from '@/lib/clientIp'

// request.url's origin cannot be trusted behind a reverse proxy (found via
// a real tailscale-serve test 2026-09-29: the browser hit
// https://<tailscale-host>:8444/auth/callback, but request.url's origin
// resolved to the proxy's internal localhost address, sending the final
// redirect to a host the phone can't reach). X-Forwarded-Proto/Host are
// what the proxy actually tells us the client-facing address was; prefer
// those, and only fall back to request.url's own origin for the
// unproxied case (plain `next dev` on localhost).
function trustedOrigin(request: Request, fallback: string): string {
  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host')
  return proto && host ? `${proto}://${host}` : fallback
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = trustedOrigin(request, url.origin)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  // Set by /signup's consent box (components/signup-consent-gate.tsx), on
  // the LINE/Google round trip and on the email confirmation link -- there's
  // no session to record consent against until this exact point.
  const consentGiven = url.searchParams.get('consent') === '1'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await ensurePlayer(supabase, data.user)
      const h = await headers()
      await recordSignupConsent(supabase, data.user, { ticked: consentGiven, ip: clientIp(h), userAgent: h.get('user-agent'), next })
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Back to /login, not `next`: `next` is very often a venue page whose
  // own login-first gate would immediately redirect an unauthenticated
  // visitor onward to /login anyway, silently dropping this query param
  // in the process (found 2026-09-30 -- a failed sign-in showed the user
  // nothing at all, because the error flag never survived that second
  // hop). /login is also where the retry buttons actually live.
  return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&auth_error=1`)
}
