import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import { createClient } from '@/lib/supabaseServer'
import { AUTH0_ID_TOKEN_COOKIE } from '@/lib/auth0'
import LangSwitch from '@/components/lang-switch'
import PoweredByFooter from '@/components/powered-by-footer'
import AccountForm from './account-form'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'accountTitle'), robots: { index: false, follow: false } }
}

export default async function AccountPage() {
  const lang = await currentLang()
  const supabase = await createClient()
  // current_player_id(), not auth.getUser() -- getUser() is GoTrue-
  // specific and returns nothing for an Auth0/LINE session, which has no
  // auth.users row to look up. This one RPC works for both providers.
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) {
    redirect('/login?next=%2Faccount')
  }

  const [{ data: player }, { data: training }] = await Promise.all([
    supabase.from('players').select('display_name').eq('id', playerId).maybeSingle(),
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

  return (
    <main className="share-page">
      <div className="share-shell" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LangSwitch lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{t(lang, 'accountTitle')}</h1>
          <AccountForm
            lang={lang}
            initialName={player?.display_name ?? ''}
            initialTraining={training?.consented ?? false}
            isLineAccount={isLineAccount}
            initialEmail={email}
            hasPassword={hasPassword}
          />
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
