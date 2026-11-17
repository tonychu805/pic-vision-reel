import { cookies } from 'next/headers'
import type { createClient } from '@/lib/supabaseServer'
import { AUTH0_ID_TOKEN_COOKIE } from '@/lib/auth0'

// What the one-time basic-information page (app/signup/profile) collected; shown and editable on the account page.
export type ProfileFields = {
  firstName: string
  lastName: string
  birthDate: string | null
  phoneCountry: string | null
  phone: string | null
  gender: 'men' | 'women' | null
  location: string | null
  marketingOptIn: boolean
}

export type AccountData = {
  displayName: string
  trainingConsented: boolean
  // Opt-in (2026-11-17): never answered means off.
  promoConsented: boolean
  isLineAccount: boolean
  email: string | null
  hasPassword: boolean
  memberSince: string | null
  // The one-time basic-information page (app/signup/profile) has been filled in.
  profileComplete: boolean
  profile: ProfileFields
}

// Shared by /account (the standalone fallback landing page after
// login/signup when there's no venue `next` to return to) and the
// calendar page's 帳號 tab (app/[slug]/[code]) -- same account, same
// fetch either way, written once rather than drifting into two copies.
export async function getAccountData(supabase: Awaited<ReturnType<typeof createClient>>, playerId: string): Promise<AccountData> {
  const [{ data: player }, { data: training }, { data: promo }] = await Promise.all([
    supabase.from('players').select('display_name, created_at, profile_completed_at, first_name, last_name, birth_date, phone_country, phone, gender, location, marketing_opt_in').eq('id', playerId).maybeSingle(),
    supabase.from('player_training_consents').select('consented').eq('player_id', playerId).maybeSingle(),
    supabase.from('player_promo_consents').select('consented').eq('player_id', playerId).maybeSingle(),
  ])

  // Email/password only make sense for a GoTrue (Google/email) session --
  // a LINE/Auth0 session has no auth.users row and no password concept at
  // all. Checked directly by cookie presence, the same signal
  // lib/supabaseServer.ts's createClient() already uses to choose which
  // kind of client to build, rather than re-deriving it a different way.
  const cookieStore = await cookies()
  const isLineAccount = cookieStore.has(AUTH0_ID_TOKEN_COOKIE)
  let email: string | null = null
  let hasPassword = false
  if (!isLineAccount) {
    const { data: userData } = await supabase.auth.getUser()
    email = userData.user?.email ?? null
    // Google-linked accounts have no password of their own yet (account
    // linking isn't built -- see ADR-149's follow-up discussion) --
    // showing a "change password" field for one would silently create a
    // password credential alongside their Google sign-in, which is a
    // real feature but not one anyone asked for or has been told about.
    hasPassword = userData.user?.app_metadata?.provider === 'email'
  }

  return {
    displayName: player?.display_name ?? '',
    profileComplete: Boolean(player?.profile_completed_at),
    profile: {
      firstName: player?.first_name ?? '',
      lastName: player?.last_name ?? '',
      birthDate: player?.birth_date ?? null,
      phoneCountry: player?.phone_country ?? null,
      phone: player?.phone ?? null,
      gender: player?.gender === 'men' || player?.gender === 'women' ? player.gender : null,
      location: player?.location ?? null,
      marketingOptIn: Boolean(player?.marketing_opt_in),
    },
    // Opt-out (operator 2026-11-16): never answered means on, as the archive rule reads it.
    trainingConsented: training?.consented ?? true,
    promoConsented: promo?.consented === true,
    isLineAccount,
    email,
    hasPassword,
    memberSince: player?.created_at ?? null,
  }
}
