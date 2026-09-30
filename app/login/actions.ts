'use server'

// Email sign-in/sign-up completes client-side (supabase.auth.signInWithPassword
// / signUp), unlike LINE/Google which round-trip through /auth/callback.
// ensurePlayer() still needs to run somewhere after a session exists --
// this Server Action is that "somewhere", called from EmailAuthForm right
// after a successful client-side auth call.
import { createClient } from '@/lib/supabaseServer'
import { ensurePlayer } from '@/lib/player'

export async function ensurePlayerAfterEmailAuth() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) await ensurePlayer(supabase, data.user)
}
