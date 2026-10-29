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
  const [trainingMessage, setTrainingMessage] = useState<{ text: string; failed: boolean } | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordResult, setPasswordResult] = useState<string | null>(null)

  // Name and the training toggle save separately (Court Club, 2026-10-28):
  // the toggle saves the moment it moves and flips back if that fails.
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
      setTrainingMessage({ text: t(lang, 'savedMessage'), failed: false })
    } catch {
      setTraining(!value)
      setTrainingMessage({ text: t(lang, 'trainingSaveFailed'), failed: true })
    } finally { setBusy(false) }
  }

  async function changeEmail() {
    if (!newEmail.trim()) return
    setEmailBusy(true)
    setEmailResult(null)
    try {
      const { error } = await updateEmail(newEmail)
      setEmailResult(error ?? t(lang, 'emailChangePending'))
      if (!error) setNewEmail('')
    } catch {
      setEmailResult(t(lang, 'genericError'))
    } finally {
      setEmailBusy(false)
    }
  }

  async function changePassword() {
    if (!newPassword) return
    setPasswordBusy(true)
    setPasswordResult(null)
    try {
      const { error } = await updatePassword(newPassword)
      setPasswordResult(error ?? t(lang, 'passwordChanged'))
      if (!error) setNewPassword('')
    } catch {
      setPasswordResult(t(lang, 'genericError'))
    } finally {
      setPasswordBusy(false)
    }
  }

  async function signOut() {
    try {
      await signOutEverywhere()
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
    } catch {
      setNameMessage(t(lang, 'genericError'))
    }
  }

  const initial = (savedName || initialEmail || '?').trim().charAt(0).toUpperCase()
  const signInMethod = isLineAccount ? 'LINE' : hasPassword ? t(lang, 'signInMethodEmail') : t(lang, 'signInMethodGoogle')

  return (
    <div className="account-layout">
      <div className="account-header">
        <div className="account-avatar" aria-hidden="true">{initial}</div>
        <div className="account-identity">
          {editingName ? (
            <div className="account-name-edit">
              <label className="field-label" htmlFor="account-name">{t(lang, 'nameLabel')}</label>
              <input id="account-name" autoFocus className="field-input" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') { setName(savedName); setEditingName(false) } }} />
              <div className="button-row">
                <button type="button" className="btn btn--primary" disabled={busy} onClick={saveName}>{t(lang, 'saveButton')}</button>
                <button type="button" className="btn btn--quiet" disabled={busy} onClick={() => { setName(savedName); setEditingName(false); setNameMessage(null) }}>{t(lang, 'cancel')}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="account-name-button" onClick={() => setEditingName(true)} aria-label={t(lang, 'editName')}>
              <span className={`account-header-name${savedName ? '' : ' account-header-name--empty'}`}>{savedName || t(lang, 'nameNotSet')}</span>
              <span className="account-edit-hint">{t(lang, 'editName')}</span>
            </button>
          )}
        </div>
      </div>

      {nameMessage && <p role="alert" className="form-note form-note--error">{nameMessage}</p>}

      <section className="panel">
        <h2 className="panel-title">{t(lang, 'sectionPrivacy')}</h2>
        <label className="setting-row">
          <span className="setting-text">{t(lang, 'consentTraining')}</span>
          <span className="switch">
            <input type="checkbox" checked={training} disabled={busy} onChange={(e) => void changeTraining(e.target.checked)} />
            <span className="switch-track" />
          </span>
        </label>
        {trainingMessage && <p role={trainingMessage.failed ? 'alert' : 'status'} className={trainingMessage.failed ? 'form-note form-note--error' : 'form-note'}>{trainingMessage.text}</p>}
      </section>

      <section className="panel">
        <h2 className="panel-title">{t(lang, 'sectionSecurity')}</h2>
        <div className="setting-row">
          <span className="setting-text">{t(lang, 'signInMethodLabel')}</span>
          <span className="tag">{signInMethod}</span>
        </div>

        {!isLineAccount && (
          <>
            <div className="field-group">
              <label className="field-label" htmlFor="account-email">{t(lang, 'emailLabel')}</label>
              {initialEmail && <p className="field-current">{initialEmail}</p>}
              <input
                id="account-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t(lang, 'newEmailLabel')} className="field-input"
              />
              <button type="button" className="btn btn--secondary" disabled={emailBusy || !newEmail.trim()} onClick={changeEmail}>
                {t(lang, 'changeEmailButton')}
              </button>
              {emailResult && <p className="form-note">{emailResult}</p>}
            </div>

            {hasPassword && (
              <div className="field-group">
                <label className="field-label" htmlFor="account-password">{t(lang, 'newPasswordLabel')}</label>
                <input
                  id="account-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="field-input"
                />
                <button type="button" className="btn btn--secondary" disabled={passwordBusy || !newPassword} onClick={changePassword}>
                  {t(lang, 'changePasswordButton')}
                </button>
                {passwordResult && <p className="form-note">{passwordResult}</p>}
              </div>
            )}
          </>
        )}
      </section>

      <div className="account-footer-actions">
        <button type="button" onClick={signOut} className="link-button">
          {t(lang, 'signOut')}
        </button>
        {showBackLink && (
          <button type="button" onClick={() => router.back()} className="link-button">
            {t(lang, 'backLabel')}
          </button>
        )}
      </div>
    </div>
  )
}
