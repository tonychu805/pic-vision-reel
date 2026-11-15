'use client'

// The one-time basic-information form (app/signup/profile). Only the first
// name is required, so a player who came to watch a highlight isn't held up.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import { saveSignupProfile } from '@/app/signup/profile/actions'

// Taiwan first; a short list so a number reads back correctly.
const DIAL_CODES = ['+886', '+1', '+81', '+82', '+852', '+65', '+86', '+44']

export default function SignupProfileForm({ lang, next, initialName }: { lang: Lang; next: string; initialName: string }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(initialName.split(' ')[0] ?? '')
  const [lastName, setLastName] = useState(initialName.split(' ').slice(1).join(' '))
  const [birthDate, setBirthDate] = useState('')
  const [dialCode, setDialCode] = useState(DIAL_CODES[0])
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'men' | 'women' | null>(null)
  const [location, setLocation] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!firstName.trim()) { setError(t(lang, 'firstNameRequired')); return }
    setBusy(true)
    const { error: saveError } = await saveSignupProfile({
      firstName, lastName, birthDate: birthDate || null, phoneCountry: dialCode, phone: phone || null,
      gender, location: location || null, marketingOptIn,
    })
    if (saveError) { setBusy(false); setError(t(lang, saveError as StringKey)); return }
    router.push(next)
    router.refresh()
  }

  const optional = <span className="profile-optional">{t(lang, 'optionalSuffix')}</span>
  return (
    <form onSubmit={submit} className="profile-form">
      <div className="profile-row">
        <label className="profile-field">
          <span className="profile-label">{t(lang, 'firstNameLabel')}</span>
          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
            placeholder={t(lang, 'firstNamePlaceholder')} className="field-input" autoComplete="given-name" />
        </label>
        <label className="profile-field">
          <span className="profile-label">{t(lang, 'lastNameLabel')} {optional}</span>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
            placeholder={t(lang, 'lastNamePlaceholder')} className="field-input" autoComplete="family-name" />
        </label>
      </div>
      <label className="profile-field">
        <span className="profile-label">{t(lang, 'birthDateLabel')} {optional}</span>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="field-input" autoComplete="bday" />
      </label>
      <div className="profile-field">
        <span className="profile-label">{t(lang, 'phoneLabel')} {optional}</span>
        <div className="profile-phone">
          <select value={dialCode} onChange={(e) => setDialCode(e.target.value)} className="field-input profile-dial" aria-label={t(lang, 'phoneLabel')}>
            {DIAL_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder={t(lang, 'phonePlaceholder')} className="field-input" autoComplete="tel-national" />
        </div>
      </div>
      <div className="profile-field">
        <span className="profile-label">{t(lang, 'genderLabel')} {optional}</span>
        <div className="profile-segmented" role="group">
          {(['men', 'women'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={gender === value}
              onClick={() => setGender(gender === value ? null : value)}
              className={gender === value ? 'profile-segment profile-segment--on' : 'profile-segment'}>
              {t(lang, value === 'men' ? 'genderMen' : 'genderWomen')}
            </button>
          ))}
        </div>
      </div>
      <label className="profile-field">
        <span className="profile-label">{t(lang, 'locationLabel')} {optional}</span>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder={t(lang, 'locationPlaceholder')} className="field-input" autoComplete="address-level2" />
      </label>
      <label className="consent-choice-label profile-marketing">
        <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
        <span>{t(lang, 'marketingOptIn')}</span>
      </label>
      {error && <p className="form-note form-note--error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn--primary btn--block">{t(lang, 'continueLabel')}</button>
    </form>
  )
}
