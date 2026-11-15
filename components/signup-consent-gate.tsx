'use client'
// The signup screen's legal line (operator 2026-11-16, the Anthropic pattern):
// no checkbox. One sentence linking the filming notice and the privacy policy,
// placed under the email field and above 建立帳號; LINE and Google sign-up
// stay above it. Signing up records filming consent as before (the OAuth
// state and the email form send consent=1). Training is opt-out, explained in
// the privacy policy and switched off in Account settings.
import { t, type Lang } from '@/lib/i18n'
import SignInButtons from './sign-in-buttons'
import EmailAuthForm from './email-auth-form'

export default function SignupConsentGate({ lang, next }: { lang: Lang; next: string }) {
  const notice = (
    <p className="consent-legal">
      {t(lang, 'consentPrefix')}{' '}
      <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentNoticeLink')}</a>
      {' '}{t(lang, 'consentMiddle')}{' '}
      <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentPrivacyLink')}</a>
      {t(lang, 'consentSuffix')}
    </p>
  )
  return (
    <>
      <SignInButtons lang={lang} next={next} mode="signup" />
      <p className="or-divider">{t(lang, 'orDivider')}</p>
      <EmailAuthForm lang={lang} mode="signup" next={next} notice={notice} />
    </>
  )
}
