'use client'

// Under a claimed game: asks once whether the venue may use that game's
// highlights in promotion (operator 2026-11-17), then shows the answer with a
// text control to change it. Nothing here when the account setting already
// agrees. The prompt state comes from lib/promoPrompt.ts; the server's value is
// the starting point and a successful answer replaces it locally.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import type { PromoPrompt } from '@/lib/promoPrompt'
import { answerSessionPromo, setPromoConsent } from './actions'

export default function PromoCard({
  lang, venueName, sessionId, initial,
}: { lang: Lang; venueName: string; sessionId: string; initial: PromoPrompt }) {
  const router = useRouter()
  const [local, setLocal] = useState<PromoPrompt | null>(null)
  const [future, setFuture] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const prompt = local ?? initial

  async function answer(allowed: boolean, alsoFuture: boolean) {
    setBusy(true)
    setFailed(false)
    try {
      const first = await answerSessionPromo(sessionId, allowed)
      if (first.error) throw new Error(first.error)
      if (allowed && alsoFuture) {
        const second = await setPromoConsent(true, 'claim')
        if (second.error) throw new Error(second.error)
        setLocal({ kind: 'covered-by-account' })
      } else {
        setLocal({ kind: 'answered', allowed })
      }
      router.refresh()
    } catch {
      setFailed(true)
    } finally { setBusy(false) }
  }

  if (prompt.kind === 'covered-by-account') return null

  return (
    <div className="promo-card">
      {prompt.kind === 'ask' ? (
        <>
          <div className="promo-card-head">
            <p className="promo-card-title">{t(lang, 'promoCardTitle', { venue: venueName })}</p>
            <button type="button" className="icon-btn" disabled={busy} aria-label={t(lang, 'promoCardDismiss')} onClick={() => void answer(false, false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="button-row">
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(true, future)}>{t(lang, 'promoCardYes')}</button>
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(false, false)}>{t(lang, 'promoCardNo')}</button>
          </div>
          <label className="promo-card-future">
            <input type="checkbox" checked={future} disabled={busy} onChange={(e) => setFuture(e.target.checked)} />
            <span>{t(lang, 'promoCardFuture')}</span>
          </label>
        </>
      ) : (
        <p className="promo-card-answer">
          {t(lang, prompt.allowed ? 'promoAnsweredYes' : 'promoAnsweredNo', { venue: venueName })}{' '}
          <button type="button" className="link-button" disabled={busy} onClick={() => void answer(!prompt.allowed, false)}>
            {t(lang, prompt.allowed ? 'promoChangeToNo' : 'promoChangeToYes')}
          </button>
        </p>
      )}
      {failed && <p role="alert" className="form-note form-note--error">{t(lang, 'promoSaveFailed')}</p>}
    </div>
  )
}
