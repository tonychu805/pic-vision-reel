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

export async function ensurePlayer(supabase: SupabaseClient, user: User): Promise<void> {
  const metadata = user.user_metadata as { name?: string; full_name?: string } | null
  const displayName = metadata?.name?.trim() || metadata?.full_name?.trim() || null

  await supabase
    .from('players')
    .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
}
