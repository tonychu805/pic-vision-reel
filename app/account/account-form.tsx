'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOutEverywhere } from '@/lib/auth-actions'
import { t, type Lang } from '@/lib/i18n'
import { setTrainingConsent } from '@/app/[slug]/[code]/actions'
import { updateDisplayName, updateEmail, updatePassword } from './actions'

// fontSize 16, not 14 -- iOS Safari auto-zooms the page on focus for any
// text input under 16px, and that zoom sticks around through later
// navigation (confirmed on a real phone, 2026-10-06).
const inputStyle = { padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 16 }

export default function AccountForm({
  lang, initialName, initialTraining, isLineAccount, initialEmail, hasPassword,
}: {
  lang: Lang
  initialName: string
  initialTraining: boolean
  isLineAccount: boolean
  initialEmail: string | null
  hasPassword: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [training, setTraining] = useState(initialTraining)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordResult, setPasswordResult] = useState<string | null>(null)

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

  async function changeEmail() {
    if (!newEmail.trim()) return
    setEmailBusy(true)
    setEmailResult(null)
    const { error } = await updateEmail(newEmail)
    setEmailBusy(false)
    setEmailResult(error ?? t(lang, 'emailChangePending'))
    if (!error) setNewEmail('')
  }

  async function changePassword() {
    if (!newPassword) return
    setPasswordBusy(true)
    setPasswordResult(null)
    const { error } = await updatePassword(newPassword)
    setPasswordBusy(false)
    setPasswordResult(error ?? t(lang, 'passwordChanged'))
    if (!error) setNewPassword('')
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

      {isLineAccount ? (
        <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>{t(lang, 'signedInWithLine')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
            <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(lang, 'emailLabel')}</label>
            {initialEmail && <p style={{ fontSize: 13.5, margin: 0 }}>{initialEmail}</p>}
            <input
              type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t(lang, 'newEmailLabel')} style={inputStyle}
            />
            <button
              className="calendar-slot" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
              disabled={emailBusy || !newEmail.trim()} onClick={changeEmail}
            >
              {t(lang, 'changeEmailButton')}
            </button>
            {emailResult && <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>{emailResult}</p>}
          </div>

          {hasPassword && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
              <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(lang, 'newPasswordLabel')}</label>
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
              <button
                className="calendar-slot" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}
                disabled={passwordBusy || !newPassword} onClick={changePassword}
              >
                {t(lang, 'changePasswordButton')}
              </button>
              {passwordResult && <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>{passwordResult}</p>}
            </div>
          )}
        </>
      )}

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
