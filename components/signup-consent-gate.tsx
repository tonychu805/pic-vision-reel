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
  // Optional, never part of consentGiven/gating -- a player can sign up
  // and check in without ever touching this box.
  const [trainingBox, setTrainingBox] = useState(false)
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
      <SignInButtons lang={lang} next={next} mode="signup" consentGiven={consentGiven} trainingConsent={trainingBox} onBlocked={handleBlocked} />
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>{t(lang, 'orDivider')}</p>
      <EmailAuthForm lang={lang} mode="signup" next={next} consentGiven={consentGiven} trainingConsent={trainingBox} onBlocked={handleBlocked} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>
          {t(lang, 'consentPrefix')}{' '}
          <a href="https://picvisionai.com/venue-player-notice-template" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentNoticeLink')}</a>
          {' '}{t(lang, 'consentMiddle')}{' '}
          <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentPrivacyLink')}</a>
          {t(lang, 'consentSuffix')}
        </p>
        <label style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'center' }}>
          <input
            key={`essential-${shakeToken}`}
            type="checkbox" checked={essentialBox} onChange={(e) => setEssentialBox(e.target.checked)}
            className={!essentialBox && shakeToken > 0 ? 'consent-box--needed' : ''}
          />
          {t(lang, 'consentEssential')}
        </label>
        <label style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'center' }}>
          <input type="checkbox" checked={trainingBox} onChange={(e) => setTrainingBox(e.target.checked)} />
          {t(lang, 'consentTraining')}
        </label>
      </div>
    </>
  )
}
