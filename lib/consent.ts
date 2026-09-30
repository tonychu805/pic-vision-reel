// Must be kept in sync BY HAND with the version baked into the console's
// record_player_consent()/player_check_in()/get_check_in_options()/
// player_join_check_in() SQL functions (currently
// pic-vision-cloud-console/supabase/migrations/20260930070000_consent_version_2026_09_30.sql)
// and with the shared updatedAt stamp on pic-vision-website's /privacy,
// /refund-policy and /venue-player-notice-template pages. This constant is
// UI-only (what the consent screen displays/gates on) -- the database
// functions are the authoritative check and will reject a stale version
// regardless of what this file says. Same hand-maintained-duplicate shape
// as SLUG_RE/CODE_RE in app/[slug]/[code]/page.tsx.
//
// Found stale 2026-09-30: this stayed at '2026-09-27' when the database
// functions were bumped to '2026-09-30' (ADR-146), so this page would have
// treated a player's outdated consent as current while get_check_in_options
// correctly said otherwise -- the two disagreeing rather than either
// failing loudly.
export const CONSENT_VERSION = '2026-09-30'
