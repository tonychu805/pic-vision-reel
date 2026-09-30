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
    setBusy(true)
    setError(null)
    const { error } = await recordConsent(essentialBox, essentialBox)
    setBusy(false)
    if (error) {
      setError(t(lang, 'genericError'))
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
        {t(lang, 'consentPrefix')}{' '}
        <a href="https://picvisionai.com/venue-player-notice-template" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentNoticeLink')}</a>
        {' '}{t(lang, 'consentMiddle')}{' '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentPrivacyLink')}</a>
        {t(lang, 'consentSuffix')}
      </p>
      <label style={{ display: 'flex', gap: 8, fontSize: 13.5 }}>
        <input type="checkbox" checked={essentialBox} onChange={(e) => setEssentialBox(e.target.checked)} />
        {t(lang, 'consentEssential')}
      </label>
      <button
        className="calendar-slot"
        style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
        disabled={!essentialBox || busy}
        onClick={submit}
      >
        {t(lang, 'consentSubmit')}
      </button>
      {error && <p style={{ color: 'var(--error, #c0392b)', fontSize: 12.5 }}>{error}</p>}
    </div>
  )
}
