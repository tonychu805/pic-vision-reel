'use server'

import { createClient } from '@/lib/supabaseServer'

// Relies on players' own "update own row" RLS policy (id =
// current_player_id()) -- no RPC needed for a single-column update this
// narrow. Verified directly against production: the owner can update
// their own row, a different uid affects 0 rows (tested with `set local
// role authenticated`, not just set_config, since a plain execute_sql
// connection bypasses RLS entirely and would give a false pass either
// way).
export async function updateDisplayName(name: string) {
  const trimmed = name.trim()
  const supabase = await createClient()
  // current_player_id(), not auth.getUser() -- see app/account/page.tsx.
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) return { error: 'not signed in' }
  const { error } = await supabase.from('players').update({ display_name: trimmed || null }).eq('id', playerId)
  return { error: error?.message ?? null }
}
