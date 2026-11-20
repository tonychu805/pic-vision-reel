'use client'
// The signup screen's consent (operator 2026-11-16): one required box whose
// label is the sentence linking the filming notice and the privacy policy,
// placed under the email field and above 建立帳號. LINE and Google sign-up stay
// above it; every signup button stays clickable, and clicking one without the
// box ticked doesn't proceed but shakes the box red (handleBlocked). Training
// is opt-out, explained in the privacy policy and switched off in Account
// settings, so there is no training box here. Below the required box sits a
// separate optional one (2026-11-17), unticked, that sets the account-wide
// promotion consent (every partner venue may use the player's highlights); it
// shows on every signup and no button waits on it (2026-11-18).
import { useState } from 'react'
import { t, type Lang } from '@/lib/i18n'
import SignInButtons from './sign-in-buttons'
import EmailAuthForm from './email-auth-form'
import ConsentSentence from './consent-sentence'

export default function SignupConsentGate({ lang, next }: { lang: Lang; next: string }) {
  const [essentialBox, setEssentialBox] = useState(false)
  // Optional and off by default: never gates a signup button.
  const [promoBox, setPromoBox] = useState(false)
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
        <ConsentSentence lang={lang} />
      </label>
      <label className="consent-choice-label consent-choice-label--optional">
        <input type="checkbox" checked={promoBox} onChange={(e) => setPromoBox(e.target.checked)} />
        <span>
          {t(lang, 'promoSignupLabel')}
          <span className="consent-choice-hint">{t(lang, 'promoSignupHint')}</span>
        </span>
      </label>
    </div>
  )
  return (
    <>
      <SignInButtons lang={lang} next={next} mode="signup" consentGiven={essentialBox} promoGiven={promoBox} onBlocked={handleBlocked} />
      <p className="or-divider">{t(lang, 'orDivider')}</p>
      <EmailAuthForm lang={lang} mode="signup" next={next} consentGiven={essentialBox} promoGiven={promoBox} onBlocked={handleBlocked} notice={notice} />
    </>
  )
}
