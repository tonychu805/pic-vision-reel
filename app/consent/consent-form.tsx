'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import { recordConsent } from '@/app/[slug]/[code]/actions'

export default function ConsentForm({ lang, next }: { lang: Lang; next: string }) {
  const router = useRouter()
  // Filming consent + the retention policy used to be two checkboxes;
  // merged 2026-09-30 -- always required together, never independently
  // optional. record_player_consent still takes two separate booleans;
  // both get this same value.
  const [essentialBox, setEssentialBox] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (busy) return
    if (!essentialBox) {
      setError(t(lang, 'consentMissingRequired'))
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await recordConsent(true, true)
    setBusy(false)
    if (error) {
      setError(t(lang, 'genericError'))
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <form className="consent-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <div className="consent-choice">
        <span className="consent-choice-tag">{t(lang, 'consentRequiredLabel')}</span>
        <label className="consent-choice-label">
          <input type="checkbox" checked={essentialBox} onChange={(event) => { setEssentialBox(event.target.checked); setError(null) }} aria-invalid={error === t(lang, 'consentMissingRequired')} />
          <span>{t(lang, 'consentEssential')}</span>
        </label>
      </div>
      <p className="consent-legal">
        {t(lang, 'consentPrefix')}{' '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentNoticeLink')}</a>
        {' '}{t(lang, 'consentMiddle')}{' '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer">{t(lang, 'consentPrivacyLink')}</a>
        {t(lang, 'consentSuffix')}
      </p>
      <p className="consent-legal">{t(lang, 'consentTrainingNote')}</p>
      {error && <p className="consent-error" role="alert">{error}</p>}
      <button className="consent-submit" type="submit" disabled={busy}>
        {busy ? t(lang, 'consentSaving') : t(lang, 'consentSubmit')}
      </button>
    </form>
  )
}
