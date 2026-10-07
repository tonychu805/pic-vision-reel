import { cookies } from 'next/headers'
import type { createClient } from '@/lib/supabaseServer'
import { AUTH0_ID_TOKEN_COOKIE } from '@/lib/auth0'

export type AccountData = {
  displayName: string
  trainingConsented: boolean
  isLineAccount: boolean
  email: string | null
  hasPassword: boolean
  memberSince: string | null
}

// Shared by /account (the standalone fallback landing page after
// login/signup/consent when there's no venue `next` to return to) and the
// calendar page's 帳號 tab (app/[slug]/[code]) -- same account, same
// fetch either way, written once rather than drifting into two copies.
export async function getAccountData(supabase: Awaited<ReturnType<typeof createClient>>, playerId: string): Promise<AccountData> {
  const [{ data: player }, { data: training }] = await Promise.all([
    supabase.from('players').select('display_name, created_at').eq('id', playerId).maybeSingle(),
    supabase.from('player_training_consents').select('consented').eq('player_id', playerId).maybeSingle(),
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
    trainingConsented: training?.consented ?? false,
    isLineAccount,
    email,
    hasPassword,
    memberSince: player?.created_at ?? null,
  }
}
