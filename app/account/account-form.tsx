'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOutEverywhere } from '@/lib/auth-actions'
import { t, type Lang } from '@/lib/i18n'
import { setTrainingConsent } from '@/app/[slug]/[code]/actions'
import { updateDisplayName, updateEmail, updatePassword } from './actions'


export default function AccountForm({
  lang, initialName, initialTraining, isLineAccount, initialEmail, hasPassword, memberSince, showBackLink = true,
}: {
  lang: Lang
  initialName: string
  initialTraining: boolean
  isLineAccount: boolean
  initialEmail: string | null
  hasPassword: boolean
  memberSince: string | null
  // false on the calendar page's 帳號 tab (app/[slug]/[code]) -- there's a
  // bottom nav to switch tabs with, so "← Back" would be a second, redundant
  // way to leave. Still true (default) on the standalone /account page.
  showBackLink?: boolean
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

  const initial = (initialName || initialEmail || '?').trim().charAt(0).toUpperCase()
  const signInMethod = isLineAccount ? 'LINE' : hasPassword ? t(lang, 'signInMethodEmail') : t(lang, 'signInMethodGoogle')
  const memberSinceText = memberSince
    ? t(lang, 'memberSinceLabel', {
        date: new Date(memberSince).toLocaleDateString(lang === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'long' }),
      })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="account-header">
        <div className="account-avatar">{initial}</div>
        <div>
          <div className="account-header-name" style={initialName ? undefined : { color: 'var(--muted)', fontWeight: 400, fontStyle: 'italic' }}>
            {initialName || t(lang, 'nameNotSet')}
          </div>
          <div className="account-header-meta">
            {signInMethod}
            {memberSinceText && ` · ${memberSinceText}`}
          </div>
        </div>
      </div>

      <div className="account-section">
        <div className="account-section-title">{t(lang, 'sectionProfile')}</div>
        <label className="account-field-label">{t(lang, 'nameLabel')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        <button className="calendar-slot" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'center' }} disabled={busy} onClick={save}>
          {t(lang, 'saveButton')}
        </button>
        {saved && <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>{t(lang, 'savedMessage')}</p>}
      </div>

      <div className="account-section">
        <div className="account-section-title">{t(lang, 'sectionPrivacy')}</div>
        <label className="account-row" style={{ cursor: 'pointer' }}>
          <span className="account-row-text">{t(lang, 'consentTraining')}</span>
          <span className="account-toggle">
            <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} />
            <span className="account-toggle-track" />
          </span>
        </label>
      </div>

      <div className="account-section">
        <div className="account-section-title">{t(lang, 'sectionSecurity')}</div>
        <div className="account-row">
          <span className="account-row-text">{t(lang, 'signInMethodLabel')}</span>
          <span className="account-badge">{signInMethod}</span>
        </div>

        {!isLineAccount && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
              <label className="account-field-label">{t(lang, 'emailLabel')}</label>
              {initialEmail && <p style={{ fontSize: 13, margin: 0 }}>{initialEmail}</p>}
              <input
                type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t(lang, 'newEmailLabel')} className="field-input"
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
                <label className="account-field-label">{t(lang, 'newPasswordLabel')}</label>
                <input
                  type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="field-input"
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
      </div>

      <div className="account-section" style={{ flexDirection: 'row', gap: 16 }}>
        <button
          onClick={signOut}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
        >
          {t(lang, 'signOut')}
        </button>
        {showBackLink && (
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
          >
            ← {t(lang, 'backLabel')}
          </button>
        )}
      </div>
    </div>
  )
}
