'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import { agreeToCurrentTerms } from '@/app/signup/terms/actions'
import ConsentSentence from './consent-sentence'

// The optional promotion box shows only to a player who never answered it, so
// an earlier "off" in Account settings is never asked again here.
export default function TermsUpdatedForm({ lang, next, showPromo }: { lang: Lang; next: string; showPromo: boolean }) {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [promo, setPromo] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setShakeToken((k) => k + 1); return }
    setBusy(true)
    setError(null)
    const { error: saveError } = await agreeToCurrentTerms(showPromo && promo)
    if (saveError) { setBusy(false); setError(t(lang, saveError)); return }
    router.push(next)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="profile-form">
      <div className="consent-choice">
        <label className="consent-choice-label">
          <input
            key={`essential-${shakeToken}`}
            type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className={!agreed && shakeToken > 0 ? 'consent-box--needed' : ''}
          />
          <ConsentSentence lang={lang} />
        </label>
        {showPromo && (
          <label className="consent-choice-label consent-choice-label--optional">
            <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} />
            <span>
              {t(lang, 'promoSignupLabel')}
              <span className="consent-choice-hint">{t(lang, 'promoSignupHint')}</span>
            </span>
          </label>
        )}
      </div>
      {error && <p className="form-note form-note--error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn--primary btn--block">{t(lang, 'agreeAndContinue')}</button>
    </form>
  )
}
