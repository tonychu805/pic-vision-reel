'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOutEverywhere } from '@/lib/auth-actions'
import { t, type Lang } from '@/lib/i18n'
import { setTrainingConsent, setPromoConsent } from '@/app/[slug]/[code]/actions'
import { updateEmail, updatePassword } from './actions'
import SignupProfileForm from '@/components/signup-profile-form'
import type { ProfileFields } from '@/lib/accountData'
import type { PromoVenue } from '@/lib/promoPrompt'


export default function AccountForm({
  lang, initialName, initialTraining, initialPromoVenues, isLineAccount, initialEmail, hasPassword, profile,
}: {
  lang: Lang
  initialName: string
  initialTraining: boolean
  initialPromoVenues: PromoVenue[]
  isLineAccount: boolean
  initialEmail: string | null
  hasPassword: boolean
  memberSince: string | null
  // false on the calendar page's 帳號 tab (app/[slug]/[code]) -- there's a
  // bottom nav to switch tabs with, so "← Back" would be a second, redundant
  // way to leave. Still true (default) on the standalone /account page.
  profile: ProfileFields
}) {
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [savedName, setSavedName] = useState(initialName)
  const [training, setTraining] = useState(initialTraining)
  // slug -> on/off; a venue never set (null) shows off.
  const [promo, setPromo] = useState<Record<string, boolean>>(() => Object.fromEntries(initialPromoVenues.map((v) => [v.slug, v.consented === true])))
  const [promoBusySlug, setPromoBusySlug] = useState<string | null>(null)
  const [promoMessage, setPromoMessage] = useState<{ text: string; failed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null)
  const [trainingMessage, setTrainingMessage] = useState<{ text: string; failed: boolean } | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordResult, setPasswordResult] = useState<string | null>(null)

  // The training toggle saves the moment it moves and flips back if that fails.
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

  async function changePromo(slug: string, value: boolean) {
    setPromo((p) => ({ ...p, [slug]: value }))
    setPromoBusySlug(slug)
    setPromoMessage(null)
    try {
      const { error } = await setPromoConsent(slug, value, 'account')
      if (error) throw new Error(error)
      setPromoMessage({ text: t(lang, 'savedMessage'), failed: false })
    } catch {
      setPromo((p) => ({ ...p, [slug]: !value }))
      setPromoMessage({ text: t(lang, 'promoSaveFailed'), failed: true })
    } finally { setPromoBusySlug(null) }
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
      setSignOutMessage(t(lang, 'genericError'))
    }
  }

  const initial = (savedName || initialEmail || '?').trim().charAt(0).toUpperCase()
  const signInMethod = isLineAccount ? 'LINE' : hasPassword ? t(lang, 'signInMethodEmail') : t(lang, 'signInMethodGoogle')

  return (
    <div className="account-layout">
      <div className="account-header">
        <div className="account-avatar" aria-hidden="true">{initial}</div>
        {/* Shown only; edited in 基本資料 (operator, 2026-11-19: one place for the name). */}
        <div className="account-identity">
          <span className={`account-header-name${savedName ? '' : ' account-header-name--empty'}`}>{savedName || t(lang, 'nameNotSet')}</span>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-title">{t(lang, 'sectionBasicInfo')}</h2>
        {editingProfile ? (
          <SignupProfileForm lang={lang} next="/account" initialName={initialName} initial={profile}
            onSaved={(displayName) => { setEditingProfile(false); setSavedName(displayName) }} onCancel={() => setEditingProfile(false)} />
        ) : (
          <>
            <dl className="profile-summary">
              {([
                ['firstNameLabel', profile.firstName],
                ['lastNameLabel', profile.lastName],
                ['birthDateLabel', profile.birthDate],
                ['phoneLabel', profile.phone ? `${profile.phoneCountry ?? ''} ${profile.phone}`.trim() : null],
                ['genderLabel', profile.gender ? t(lang, profile.gender === 'men' ? 'genderMen' : 'genderWomen') : null],
                ['locationLabel', profile.location],
                ['marketingLabel', t(lang, profile.marketingOptIn ? 'marketingOn' : 'marketingOff')],
              ] as const).map(([label, value]) => (
                <div key={label} className="profile-summary-row">
                  <dt>{t(lang, label)}</dt>
                  <dd className={value ? undefined : 'profile-summary-empty'}>{value || t(lang, 'notProvided')}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="btn btn--secondary" onClick={() => setEditingProfile(true)}>{t(lang, 'editLabel')}</button>
          </>
        )}
      </section>
      <section className="panel">
        <h2 className="panel-title">{t(lang, 'sectionPrivacy')}</h2>
        <label className="setting-row">
          <span className="setting-text">{t(lang, 'trainingSettingTitle')}<span className="setting-hint">{t(lang, 'trainingSettingBody')}</span></span>
          <span className="switch">
            <input type="checkbox" checked={training} disabled={busy} onChange={(e) => void changeTraining(e.target.checked)} />
            <span className="switch-track" />
          </span>
        </label>
        {trainingMessage && <p role={trainingMessage.failed ? 'alert' : 'status'} className={trainingMessage.failed ? 'form-note form-note--error' : 'form-note'}>{trainingMessage.text}</p>}
        <div className="setting-text">{t(lang, 'promoSettingTitle')}<span className="setting-hint">{t(lang, 'promoSettingBody')}</span></div>
        {initialPromoVenues.length === 0 ? (
          <p className="setting-hint">{t(lang, 'promoVenuesEmpty')}</p>
        ) : initialPromoVenues.map((v) => (
          <label key={v.slug} className="setting-row">
            <span className="setting-text">{v.brand_name}</span>
            <span className="switch">
              <input type="checkbox" checked={promo[v.slug] === true} disabled={promoBusySlug === v.slug} onChange={(e) => void changePromo(v.slug, e.target.checked)} />
              <span className="switch-track" />
            </span>
          </label>
        ))}
        {promoMessage && <p role={promoMessage.failed ? 'alert' : 'status'} className={promoMessage.failed ? 'form-note form-note--error' : 'form-note'}>{promoMessage.text}</p>}
      </section>

      <section className="panel">
        <h2 className="panel-title">{t(lang, 'sectionSecurity')}</h2>
        <div className="setting-row">
          <span className="setting-text">{t(lang, 'signInMethodLabel')}</span>
          <span className="tag">{signInMethod}</span>
        </div>

        {isLineAccount && (
          <div className="field-group">
            <span className="field-label">{t(lang, 'emailLabel')}</span>
            <p className={initialEmail ? 'field-current' : 'field-current profile-summary-empty'}>{initialEmail || t(lang, 'notProvided')}</p>
            <p className="form-note">{t(lang, 'lineEmailNote')}</p>
          </div>
        )}

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
      </div>
      {signOutMessage && <p role="alert" className="form-note form-note--error">{signOutMessage}</p>}
    </div>
  )
}
