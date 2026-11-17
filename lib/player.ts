// Lazily creates the signed-in player's row (display_name only -- consent
// itself is written by the record_player_consent RPC, not here). Mirrors
// pic-vision-cloud-console's lib/brand.ts ensureBrand(): never falls back
// to the OAuth account's email for display_name, since that mistake
// leaked owner emails onto public reel pages once already (see
// ensureBrand's comment, 2026-09-06).
//
// ignoreDuplicates: true -- this now runs on every sign-in (OAuth
// callback AND email login), not just first signup. A plain upsert would
// UPDATE display_name on every call, and email login has no metadata to
// read, so it would silently overwrite an existing real name with null.
// This makes it truly "create if missing, leave alone otherwise" (INSERT
// ... ON CONFLICT DO NOTHING), matching the same do-nothing pattern
// record_player_consent()'s SQL already uses for this table.
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { CONSENT_VERSION } from '@/lib/consent'
import { promoTickedInMetadata } from '@/lib/promoPrompt'

export async function ensurePlayer(supabase: SupabaseClient, user: User): Promise<void> {
  const metadata = user.user_metadata as { name?: string; full_name?: string } | null
  const displayName = metadata?.name?.trim() || metadata?.full_name?.trim() || null

  await supabase
    .from('players')
    .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
}

/**
 * Records filming consent for a player who ticked the signup box, once.
 *
 * Email signup has no session when the box is ticked (email confirmation is
 * on), and the confirmation link may be opened on another device or land on
 * another site, so the tick is kept on the account itself
 * (user_metadata.consent_version, set by components/email-auth-form.tsx) and
 * written here the first time the account has a session anywhere. `ticked`
 * covers the LINE/Google round trip (consent=1). record_player_consent()
 * inserts a row per call, so this skips a player already holding consent for
 * the current version.
 */
export async function recordSignupConsent(
  supabase: SupabaseClient, user: User, { ticked, ip, userAgent }: { ticked: boolean; ip: string | null; userAgent: string | null },
): Promise<void> {
  const fromSignup = (user.user_metadata as { consent_version?: string } | null)?.consent_version === CONSENT_VERSION
  if (!ticked && !fromSignup) return
  const { data: existing } = await supabase
    .from('player_consents').select('consent_version').eq('player_id', user.id).eq('consent_version', CONSENT_VERSION).limit(1)
  if (existing?.length) return
  await supabase.rpc('record_player_consent', {
    p_filming_consent: true, p_retention_policy_accepted: true, p_ip_address: ip, p_user_agent: userAgent,
  })
}

/**
 * Records the optional signup box "let the venue share my highlights", once.
 *
 * Carried exactly like the required box: `ticked` covers the LINE/Google
 * round trip (promo=1), user_metadata.promo_consent_version covers email
 * signup, whose first session may open on another device. A player who has any
 * player_promo_consents row is left alone, so a later "off" in Account
 * settings is never undone by the metadata still sitting on the account.
 */
export async function recordSignupPromoConsent(
  supabase: SupabaseClient, user: User | null, { ticked }: { ticked: boolean },
): Promise<void> {
  const fromSignup = promoTickedInMetadata(user?.user_metadata, CONSENT_VERSION)
  if (!ticked && !fromSignup) return
  const { data: existing } = await supabase.from('player_promo_consents').select('consented').limit(1)
  if (existing?.length) return
  await supabase.rpc('set_promo_consent', { p_consented: true, p_source: 'signup' })
}
