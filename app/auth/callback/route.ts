// OAuth code-exchange landing spot for signInWithOAuth({ provider: 'line' | 'google' }),
// called with redirectTo pointing here. The only genuinely new ROUTE this
// feature adds -- everything else is UI on the existing /[slug]/[code] page.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { ensurePlayer } from '@/lib/player'

// Same helper as app/[slug]/[code]/actions.ts's recordConsent -- IP/UA
// read server-side, never trusted from anything the client could have
// put in the URL itself.
function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

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
  // Set by components/sign-in-buttons.tsx only when launched from
  // /signup's consent gate (components/signup-consent-gate.tsx) with both
  // boxes already ticked -- there's no session to record consent against
  // until this exact point, so this is where that earlier tick actually
  // gets written.
  const consentGiven = url.searchParams.get('consent') === '1'
  // The optional training checkbox's actual state -- present (0 or 1)
  // whenever consent is, absent for a plain /login (not applicable there).
  const trainingParam = url.searchParams.get('training')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await ensurePlayer(supabase, data.user)
      if (consentGiven) {
        const h = await headers()
        await supabase.rpc('record_player_consent', {
          p_filming_consent: true,
          p_retention_policy_accepted: true,
          p_ip_address: clientIp(h),
          p_user_agent: h.get('user-agent'),
        })
      }
      if (trainingParam !== null) {
        await supabase.rpc('set_training_consent', { p_consented: trainingParam === '1' })
      }
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
