'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOutEverywhere } from '@/lib/auth-actions'
import { t, type Lang } from '@/lib/i18n'
import { setTrainingConsent } from '@/app/[slug]/[code]/actions'
import { updateDisplayName, updateEmail, updatePassword } from './actions'


export default function AccountForm({
  lang, initialName, initialTraining, isLineAccount, initialEmail, hasPassword, showBackLink = true,
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
  const [savedName, setSavedName] = useState(initialName)
  const [editingName, setEditingName] = useState(false)
  const [training, setTraining] = useState(initialTraining)
  const [busy, setBusy] = useState(false)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordResult, setPasswordResult] = useState<string | null>(null)

  async function saveName() {
    setBusy(true)
    setNameMessage(null)
    try {
      const { error } = await updateDisplayName(name)
      if (error) { setNameMessage(t(lang, 'nameSaveFailed')); return }
      setSavedName(name.trim())
      setEditingName(false)
    } catch { setNameMessage(t(lang, 'nameSaveFailed')) }
    finally { setBusy(false) }
  }

  async function changeTraining(value: boolean) {
    setTraining(value)
    setBusy(true)
    setTrainingMessage(null)
    try {
      const { error } = await setTrainingConsent(value)
      if (error) throw new Error(error)
      setTrainingMessage(t(lang, 'savedMessage'))
    } catch {
      setTraining(!value)
      setTrainingMessage(t(lang, 'trainingSaveFailed'))
    } finally { setBusy(false) }
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

  const initial = (savedName || initialEmail || '?').trim().charAt(0).toUpperCase()
  const signInMethod = isLineAccount ? 'LINE' : hasPassword ? t(lang, 'signInMethodEmail') : t(lang, 'signInMethodGoogle')

  return (
    <div className="account-layout">
      <div className="account-header">
        <div className="account-avatar">{initial}</div>
        <div className="account-identity">
          {editingName ? <div className="account-name-edit">
            <label className="account-field-label" htmlFor="account-name">{t(lang, 'nameLabel')}</label>
            <input id="account-name" autoFocus className="field-input" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') { setName(savedName); setEditingName(false) } }} />
            <div className="account-name-actions"><button type="button" className="checkin-btn checkin-btn--primary" disabled={busy} onClick={saveName}>{t(lang, 'saveButton')}</button><button type="button" className="checkin-btn checkin-btn--ghost" disabled={busy} onClick={() => { setName(savedName); setEditingName(false); setNameMessage(null) }}>{t(lang, 'cancel')}</button></div>
          </div> : <button type="button" className="account-name-button" onClick={() => setEditingName(true)} aria-label={t(lang, 'editName')}><span className="account-header-name">{savedName || t(lang, 'nameNotSet')}</span><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></svg></button>}
        </div>
      </div>

      {nameMessage && <p role="alert" className="account-feedback">{nameMessage}</p>}

      <section className="account-section account-panel">
        <h2 className="account-section-title">{t(lang, 'sectionPrivacy')}</h2>
        <label className="account-row" style={{ cursor: 'pointer' }}>
          <span className="account-row-text">{t(lang, 'consentTraining')}</span>
          <span className="account-toggle">
            <input type="checkbox" checked={training} disabled={busy} onChange={(e) => void changeTraining(e.target.checked)} />
            <span className="account-toggle-track" />
          </span>
        </label>
        {trainingMessage && <p role="status" className="account-feedback">{trainingMessage}</p>}
      </section>

      <section className="account-section account-panel">
        <h2 className="account-section-title">{t(lang, 'sectionSecurity')}</h2>
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
      </section>

      <div className="account-footer-actions">
        <button
          onClick={signOut}
          className="account-footer-link"
        >
          {t(lang, 'signOut')}
        </button>
        {showBackLink && (
          <button
            onClick={() => router.back()}
            className="account-footer-link"
          >
            ← {t(lang, 'backLabel')}
          </button>
        )}
      </div>
    </div>
  )
}
