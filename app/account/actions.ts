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

// Email/password only apply to a GoTrue (Google/email) session -- there's
// nothing to change for a LINE/Auth0 session, and account-form.tsx never
// renders these for one (see app/account/page.tsx's isLineAccount check).
// Both go through auth.updateUser(), same call whether made server- or
// client-side -- it just uses whatever access token the client presents,
// same as auth.getUser() already does elsewhere in this file.
//
// updateUser({ email }) doesn't take effect immediately -- Supabase sends
// a confirmation link to the new address first (GoTrue's default "secure
// email change" behavior). The success response here just means the
// request was accepted, not that the email actually changed yet.
export async function updateEmail(newEmail: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
  return { error: error?.message ?? null }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message ?? null }
}
