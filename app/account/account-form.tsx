'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOutEverywhere } from '@/lib/auth-actions'
import { t, type Lang } from '@/lib/i18n'
import { setTrainingConsent } from '@/app/[slug]/[code]/actions'
import { updateDisplayName } from './actions'

const inputStyle = { padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 14 }

export default function AccountForm({
  lang, initialName, initialTraining,
}: {
  lang: Lang
  initialName: string
  initialTraining: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [training, setTraining] = useState(initialTraining)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true)
    setSaved(false)
    const [{ error: nameError }] = await Promise.all([
      updateDisplayName(name),
      setTrainingConsent(training),
    ])
    setBusy(false)
    if (!nameError) setSaved(true)
  }

  async function signOut() {
    await signOutEverywhere()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(lang, 'nameLabel')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <label style={{ display: 'flex', gap: 8, fontSize: 13.5, alignItems: 'center' }}>
        <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} />
        {t(lang, 'consentTraining')}
      </label>
      <button className="calendar-slot" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }} disabled={busy} onClick={save}>
        {t(lang, 'saveButton')}
      </button>
      {saved && <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>{t(lang, 'savedMessage')}</p>}
      <button
        onClick={signOut}
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
      >
        {t(lang, 'signOut')}
      </button>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
      >
        ← {t(lang, 'backLabel')}
      </button>
    </div>
  )
}
