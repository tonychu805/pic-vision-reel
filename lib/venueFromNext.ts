// Best-effort venue lookup for the /login and /signup pages: they're
// otherwise deliberately venue-agnostic (a player's identity isn't scoped
// to one venue's QR code), but when `next` is a /[slug]/[code] path --
// the normal case, since app/[slug]/[code]/page.tsx's login-first gate is
// what sends players here -- showing that venue's own logo instead of the
// generic PicVision AI mark reassures a player they're checking into the
// right place. Falls back to null (caller shows the generic logo) for any
// other `next`, or if the calendar itself is off/unknown -- same
// anonymous, no-error-detail lookup app/[slug]/[code]/page.tsx already
// does via get_public_calendar, just reading brand_name/logo fields only.
import { supabasePublic } from '@/lib/supabase'
import type { LogoInk } from '@/lib/brandLogo'

const NEXT_VENUE_RE = /^\/([a-z0-9][a-z0-9-]{1,31})\/([a-z0-9]{8,64})(?:[/?#]|$)/i

export type NextVenue = { brand_name: string; logo_key: string | null; logo_ink: LogoInk | null }

export async function venueFromNext(next: string): Promise<NextVenue | null> {
  const match = NEXT_VENUE_RE.exec(next)
  if (!match) return null
  const [, slug, code] = match

  const { data } = await supabasePublic().rpc('get_public_calendar', { p_slug: slug, p_code: code })
  if (!data) return null
  return { brand_name: data.brand_name, logo_key: data.logo_key, logo_ink: data.logo_ink }
}
