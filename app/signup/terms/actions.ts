'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { clientIp } from '@/lib/clientIp'

// A signed-in player whose consent predates the current version agrees again
// on the same account. Signup can't do this: for an email account it would
// try to create the account a second time.
export async function agreeToCurrentTerms(promo: boolean): Promise<{ error: 'termsUpdatedFailed' | null }> {
  const supabase = await createClient()
  const h = await headers()
  const { error } = await supabase.rpc('record_player_consent', {
    p_filming_consent: true, p_retention_policy_accepted: true, p_ip_address: clientIp(h), p_user_agent: h.get('user-agent'),
  })
  if (error) {
    console.error('record_player_consent (terms updated) failed', error.code, error.message)
    return { error: 'termsUpdatedFailed' }
  }
  if (promo) {
    const { error: promoError } = await supabase.rpc('set_promo_consent', { p_consented: true, p_source: 'account' })
    if (promoError) console.error('set_promo_consent (terms updated) failed', promoError.code, promoError.message)
  }
  return { error: null }
}
