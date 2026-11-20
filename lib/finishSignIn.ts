import { headers } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { ensurePlayer, recordSignupConsent, recordSignupPromoConsent } from './player'
import { clientIp } from './clientIp'

// What every Supabase sign-in does once it has a session: the players row,
// and the signup boxes that rode along the redirect (no session existed
// when they were ticked).
export async function finishPlayerSignIn(
  supabase: SupabaseClient, user: User, { consent, promo, next }: { consent: boolean; promo: boolean; next: string },
): Promise<void> {
  await ensurePlayer(supabase, user)
  const h = await headers()
  await recordSignupConsent(supabase, user, { ticked: consent, ip: clientIp(h), userAgent: h.get('user-agent'), next })
  await recordSignupPromoConsent(supabase, user, { ticked: promo })
}
