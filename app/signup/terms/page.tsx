import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import { createClient } from '@/lib/supabaseServer'
import { CONSENT_VERSION } from '@/lib/consent'
import LangSwitch from '@/components/lang-switch'
import AuthHeader from '@/components/auth-header'
import TermsUpdatedForm from '@/components/terms-updated-form'
import PoweredByFooter from '@/components/powered-by-footer'

// Where the venue page sends a signed-in player whose consent predates the
// current version (operator 2026-11-20: sending them to /signup read as
// "your account is gone"). Once agreed, straight on to `next`.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'termsUpdatedTitle'), robots: { index: false, follow: false } }
}

export default async function TermsUpdatedPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const lang = await currentLang()
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

  const supabase = await createClient()
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) redirect(`/login?next=${encodeURIComponent(`/signup/terms?next=${encodeURIComponent(safeNext)}`)}`)

  const [{ data: current }, { data: promo }] = await Promise.all([
    supabase.from('player_consents').select('consent_version').eq('player_id', playerId).eq('consent_version', CONSENT_VERSION).limit(1),
    supabase.from('player_promo_consents').select('consented').eq('player_id', playerId).maybeSingle(),
  ])
  if (current?.length) redirect(safeNext)

  return (
    <main className="share-page">
      <div className="share-shell">
        <div className="consent-topbar">
          <LangSwitch lang={lang} />
        </div>
        <div className="auth-main">
          <AuthHeader lang={lang} next={safeNext} titleKey="termsUpdatedTitle" subtitleKey="termsUpdatedSubtitle" />
          <TermsUpdatedForm lang={lang} next={safeNext} showPromo={!promo} />
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
