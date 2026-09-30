import type { Metadata } from 'next'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import LangSwitch from '@/components/lang-switch'
import AuthHeader from '@/components/auth-header'
import SignInButtons from '@/components/sign-in-buttons'
import EmailAuthForm from '@/components/email-auth-form'
import PoweredByFooter from '@/components/powered-by-footer'

// Standalone sign-in destination, not tied to any one venue. Reached via
// ?next=<path>, e.g. from app/[slug]/[code]/checkin-panel.tsx's signed-out
// state -- signs in, then bounces back to wherever `next` points (through
// app/auth/callback/route.ts for LINE/Google, or directly client-side for
// email). Kept slug/code-agnostic deliberately: a player's identity isn't
// scoped to one venue's QR code.
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'signInTitle'), robots: { index: false, follow: false } }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth_error?: string }> }) {
  const { next, auth_error } = await searchParams
  const lang = await currentLang()
  // Only ever redirect within this app -- never follow an absolute or
  // protocol-relative `next` value (open-redirect guard).
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return (
    <main className="share-page">
      {/* minHeight (not the base .share-shell class, which other pages
          also use top-anchored) is what gives the middle block's flex:1
          actual room to center within -- justify-content alone does
          nothing on a container that's only ever as tall as its content. */}
      <div className="share-shell" style={{ minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LangSwitch lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <AuthHeader lang={lang} next={safeNext} subtitleKey="signInSubtitle" />
          {auth_error && <p style={{ textAlign: 'center', color: 'var(--error, #c0392b)', fontSize: 13 }}>{t(lang, 'authErrorMessage')}</p>}
          <SignInButtons lang={lang} next={safeNext} />
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>{t(lang, 'orDivider')}</p>
          <EmailAuthForm lang={lang} mode="login" next={safeNext} />
          <p style={{ textAlign: 'center', fontSize: 13 }}>
            {t(lang, 'noAccountYet')}{' '}
            <Link href={`/signup?next=${encodeURIComponent(safeNext)}`} style={{ color: 'var(--accent)' }}>{t(lang, 'goToSignUp')}</Link>
          </p>
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
