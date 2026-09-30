'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import { recordConsent } from '@/app/[slug]/[code]/actions'

export default function ConsentForm({ lang, next }: { lang: Lang; next: string }) {
  const router = useRouter()
  const [filmingBox, setFilmingBox] = useState(false)
  const [retentionBox, setRetentionBox] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    const { error } = await recordConsent(filmingBox, retentionBox)
    setBusy(false)
    if (error) { setError(t(lang, 'genericError')); return }
    router.push(next)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
        {t(lang, 'consentIntro')}{' '}
        <a href="https://picvisionai.com/venue-player-notice-template" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentNoticeLink')}</a>
        {' · '}
        <a href="https://picvisionai.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{t(lang, 'consentPrivacyLink')}</a>
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>{t(lang, 'consentAgeStatement')}</p>
      <label style={{ display: 'flex', gap: 8, fontSize: 13.5 }}>
        <input type="checkbox" checked={filmingBox} onChange={(e) => setFilmingBox(e.target.checked)} />
        {t(lang, 'consentFilming')}
      </label>
      <label style={{ display: 'flex', gap: 8, fontSize: 13.5 }}>
        <input type="checkbox" checked={retentionBox} onChange={(e) => setRetentionBox(e.target.checked)} />
        {t(lang, 'consentRetention')}
      </label>
      <button
        className="calendar-slot"
        style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
        disabled={!filmingBox || !retentionBox || busy}
        onClick={submit}
      >
        {t(lang, 'consentSubmit')}
      </button>
      {error && <p style={{ color: 'var(--error, #c0392b)', fontSize: 12.5 }}>{error}</p>}
    </div>
  )
}
