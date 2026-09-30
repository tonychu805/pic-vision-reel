// Must be kept in sync BY HAND with the version baked into the console's
// record_player_consent()/player_check_in() SQL functions (currently
// pic-vision-cloud-console/supabase/migrations/20260929080000_record_player_consent_fn.sql)
// and with the shared updatedAt stamp on pic-vision-website's /privacy,
// /refund-policy and /venue-player-notice-template pages. This constant is
// UI-only (what the consent screen displays/gates on) -- the database
// functions are the authoritative check and will reject a stale version
// regardless of what this file says. Same hand-maintained-duplicate shape
// as SLUG_RE/CODE_RE in app/[slug]/[code]/page.tsx.
export const CONSENT_VERSION = '2026-09-27'
