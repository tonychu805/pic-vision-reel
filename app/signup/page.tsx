import type { Metadata } from 'next'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import LangSwitch from '@/components/lang-switch'
import AuthHeader from '@/components/auth-header'
import SignupConsentGate from '@/components/signup-consent-gate'
import PoweredByFooter from '@/components/powered-by-footer'

// Mirrors app/login/page.tsx (same SignInButtons -- LINE/Google don't
// need a separate "sign up" step, first use already creates the players
// row via ensurePlayer). Only the email path differs: signUp() instead of
// signInWithPassword(), plus a name field so ensurePlayer has a
// display_name to store (mirrors pic-vision-cloud-console's sign-up
// capturing brand_name the same way).
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'signUpTitle'), robots: { index: false, follow: false } }
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const lang = await currentLang()
  // Falls back to /account, not '/' -- see app/login/page.tsx's own
  // comment on this same default.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

  return (
    <main className="share-page">
      <div className="share-shell" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LangSwitch lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <AuthHeader lang={lang} next={safeNext} subtitleKey="signUpSubtitle" />
          <SignupConsentGate lang={lang} next={safeNext} />
          <p style={{ textAlign: 'center', fontSize: 13 }}>
            {t(lang, 'haveAccountAlready')}{' '}
            <Link href={`/login?next=${encodeURIComponent(safeNext)}`} style={{ color: 'var(--accent)' }}>{t(lang, 'goToSignIn')}</Link>
          </p>
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
