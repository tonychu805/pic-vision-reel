'use server'

// Writes the basic-information page onto the player's own row (RLS: id =
// current_player_id(), for Google/email and LINE sessions alike). Only the
// name is required; the rest is optional, which is also the better PDPA
// position (collect no more than needed). Re-checked here: a server action is
// a public endpoint.
import { createClient } from '@/lib/supabaseServer'

export type SignupProfileInput = {
  firstName: string
  lastName: string
  birthDate: string | null
  phoneCountry: string | null
  phone: string | null
  gender: 'men' | 'women' | null
  location: string | null
  marketingOptIn: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function saveSignupProfile(input: SignupProfileInput) {
  const firstName = input.firstName.trim().slice(0, 60)
  const lastName = input.lastName.trim().slice(0, 60)
  if (!firstName) return { error: 'firstNameRequired' as const }
  if (input.gender !== null && input.gender !== 'men' && input.gender !== 'women') return { error: 'profileSaveFailed' as const }
  if (input.birthDate && !DATE_RE.test(input.birthDate)) return { error: 'profileSaveFailed' as const }

  const supabase = await createClient()
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) return { error: 'notSignedIn' as const }

  const phone = input.phone?.trim().slice(0, 30) || null
  const { error } = await supabase
    .from('players')
    .update({
      first_name: firstName,
      last_name: lastName || null,
      // display_name stays the one name every other page reads.
      display_name: [firstName, lastName].filter(Boolean).join(' '),
      birth_date: input.birthDate || null,
      phone,
      phone_country: phone ? input.phoneCountry : null,
      gender: input.gender,
      location: input.location?.trim().slice(0, 80) || null,
      marketing_opt_in: input.marketingOptIn,
      profile_completed_at: new Date().toISOString(),
    })
    .eq('id', playerId)
  if (error) return { error: 'profileSaveFailed' as const }
  return { error: null }
}
