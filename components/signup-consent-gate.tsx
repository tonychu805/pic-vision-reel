'use client'
// The signup screen's consent (operator 2026-11-16): the one required filming
// box plus the sentence linking the filming notice and the privacy policy,
// placed under the email field and above 建立帳號. LINE and Google sign-up stay
// above it; every signup button stays clickable, and clicking one without the
// box ticked doesn't proceed but shakes the box red (handleBlocked). Training
// is opt-out, explained in the privacy policy and switched off in Account
// settings, so there is no training box here.
import { useState } from 'react'
import { t, type Lang } from '@/lib/i18n'
import SignInButtons from './sign-in-buttons'
import EmailAuthForm from './email-auth-form'

export default function SignupConsentGate({ lang, next }: { lang: Lang; next: string }) {
  const [essentialBox, setEssentialBox] = useState(false)
  // Bumped on every blocked attempt; used as a React `key` so the box
  // remounts and the shake restarts even mid-animation.
  const [shakeToken, setShakeToken] = useState(0)
  const handleBlocked = () => setShakeToken((k) => k + 1)
  const notice = (
    <div className="consent-choice">
      <label className="consent-choice-label">
        <input
          key={`essential-${shakeToken}`}
          type="checkbox" checked={essentialBox} onChange={(e) => setEssentialBox(e.target.checked)}
          className={!essentialBox && shakeToken > 0 ? 'consent-box--needed' : ''}
        />
        <span>{t(lang, 'consentEssential')}</span>
      </label>
      <p className="consent-legal">
        {t(lang, 'consentPrefix')}{' '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentNoticeLink')}</a>
        {' '}{t(lang, 'consentMiddle')}{' '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentPrivacyLink')}</a>
        {t(lang, 'consentSuffix')}
      </p>
    </div>
  )
  return (
    <>
      <SignInButtons lang={lang} next={next} mode="signup" consentGiven={essentialBox} onBlocked={handleBlocked} />
      <p className="or-divider">{t(lang, 'orDivider')}</p>
      <EmailAuthForm lang={lang} mode="signup" next={next} consentGiven={essentialBox} onBlocked={handleBlocked} notice={notice} />
    </>
  )
}
