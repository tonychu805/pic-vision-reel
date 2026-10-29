'use client'

// Consent for /signup: every signup button (LINE, Google, email) stays
// clickable regardless of the checkboxes below -- no disabled state.
// Clicking one without both ticked doesn't proceed (no OAuth redirect, no
// signUp() call); instead it shakes the unticked box(es) red via
// handleBlocked, called back up from SignInButtons/EmailAuthForm. The
// checkbox block sits below every button (operator request 2026-09-30:
// buttons first, the "by continuing you agree to..." notice last, not
// gating from the top).
import { useState } from 'react'
import { t, type Lang } from '@/lib/i18n'
import SignInButtons from './sign-in-buttons'
import EmailAuthForm from './email-auth-form'

export default function SignupConsentGate({ lang, next }: { lang: Lang; next: string }) {
  // Filming consent + the retention policy used to be two checkboxes;
  // merged 2026-09-30 since they were always required together (never
  // independently optional) -- splitting them added a click without
  // adding any real choice.
  const [essentialBox, setEssentialBox] = useState(false)
  // Bumped on every blocked attempt; used as a React `key` below so the
  // shaking box remounts and restarts the animation even if the
  // previous shake hasn't finished playing.
  const [shakeToken, setShakeToken] = useState(0)
  const consentGiven = essentialBox

  function handleBlocked() {
    setShakeToken((k) => k + 1)
  }

  return (
    <>
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
          <a href="https://picvisionai.com/venue-player-notice-template" target="_blank" rel="noreferrer">{t(lang, 'consentNoticeLink')}</a>
          {' '}{t(lang, 'consentMiddle')}{' '}
          <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentPrivacyLink')}</a>
          {t(lang, 'consentSuffix')}
        </p>
      </div>
      <SignInButtons lang={lang} next={next} mode="signup" consentGiven={consentGiven} onBlocked={handleBlocked} />
      <p className="or-divider">{t(lang, 'orDivider')}</p>
      <EmailAuthForm lang={lang} mode="signup" next={next} consentGiven={consentGiven} onBlocked={handleBlocked} />
    </>
  )
}
