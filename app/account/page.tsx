import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import { createClient } from '@/lib/supabaseServer'
import { getAccountData } from '@/lib/accountData'
import LangSwitch from '@/components/lang-switch'
import PoweredByFooter from '@/components/powered-by-footer'
import AccountForm from './account-form'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'accountTitle'), robots: { index: false, follow: false } }
}

// Standalone page, kept alongside the calendar page's own 帳號 tab
// (app/[slug]/[code]) -- this is the fallback destination login/signup/
// consent redirect to when there's no venue `next` to return to instead,
// so it can't just fold away into that page.
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

  const account = await getAccountData(supabase, playerId)

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
            initialName={account.displayName}
            initialTraining={account.trainingConsented}
            isLineAccount={account.isLineAccount}
            initialEmail={account.email}
            hasPassword={account.hasPassword}
          />
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
