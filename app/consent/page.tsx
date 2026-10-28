import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import { createClient } from '@/lib/supabaseServer'
import { CONSENT_VERSION } from '@/lib/consent'
import LangSwitch from '@/components/lang-switch'
import PoweredByFooter from '@/components/powered-by-footer'
import ConsentForm from './consent-form'

// Mandatory gate between signing in and doing anything else, for every
// path that can produce a first-time player: LINE/Google (no way to ask
// for consent before the OAuth redirect, since we don't know yet whether
// it's a new player until after the round-trip) and an email login whose
// account predates this consent system. app/[slug]/[code]/page.tsx
// redirects here the same way it redirects to /login -- consent is a
// step in getting an account working, not something mixed into a venue
// page after the fact (operator decision 2026-09-30). Email SIGNUP
// specifically also asks for consent inline in its own form
// (components/email-auth-form.tsx), so a brand-new email account usually
// never even passes through here -- this page is the fallback that
// guarantees every path ends up consented before reaching a venue page.
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'consentPageTitle'), robots: { index: false, follow: false } }
}

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const lang = await currentLang()
  // Falls back to /account, not '/' -- see app/login/page.tsx's own
  // comment on this same default.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

  const supabase = await createClient()
  // current_player_id(), not auth.getUser() -- see app/account/page.tsx.
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) {
    redirect(`/login?next=${encodeURIComponent(`/consent?next=${encodeURIComponent(safeNext)}`)}`)
  }

  // Already consented (e.g. a stale link, or landed here right after the
  // inline signup consent already recorded it) -- nothing to do here.
  const { data: consents } = await supabase
    .from('player_consents')
    .select('id')
    .eq('consent_version', CONSENT_VERSION)
    .eq('filming_consent', true)
    .eq('retention_policy_accepted', true)
    .limit(1)
  if (consents && consents.length > 0) {
    redirect(safeNext)
  }

  return (
    <main className="share-page">
      <div className="share-shell" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LangSwitch lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{t(lang, 'consentPageTitle')}</h1>
          <ConsentForm lang={lang} next={safeNext} />
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
