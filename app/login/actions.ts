'use server'

// Email sign-in/sign-up completes client-side (supabase.auth.signInWithPassword
// / signUp), unlike LINE/Google which round-trip through /auth/callback.
// ensurePlayer() still needs to run somewhere after a session exists --
// this Server Action is that "somewhere", called from EmailAuthForm right
// after a successful client-side auth call.
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { clientIp } from '@/lib/clientIp'
import { ensurePlayer, recordSignupConsent, recordSignupPromoConsent } from '@/lib/player'

// Also records the signup box's consent the first time the account has a
// session -- for email signup that is here, on whichever device signs in.
export async function ensurePlayerAfterEmailAuth() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await ensurePlayer(supabase, data.user)
  const h = await headers()
  await recordSignupConsent(supabase, data.user, { ticked: false, ip: clientIp(h), userAgent: h.get('user-agent') })
  await recordSignupPromoConsent(supabase, data.user, { ticked: false })
}
