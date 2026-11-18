'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang } from '@/lib/i18n'
import type { PromoPrompt } from '@/lib/promoPrompt'
import { answerSessionPromo } from './actions'

// One quiet switch under a claimed game (operator 2026-11-18: the question card
// with two big buttons felt pushy). Off until the player turns it on; turning it
// on is the consent for this game only. The all-venue setting lives in Account.
export default function PromoCard({
  lang, venueName, sessionId, initial,
}: { lang: Lang; venueName: string; sessionId: string; initial: PromoPrompt }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(initial.kind === 'answered' && initial.allowed)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  // Account consent covers this game: say which venue, so the player never
  // reads the account setting as something vague (operator 2026-11-18).
  if (initial.kind === 'covered-by-account') {
    return (
      <p className="promo-covered">
        <span>✓ {t(lang, 'promoCoveredLine', { venue: venueName })}</span>
        <a href="?tab=account" className="link-button promo-covered-link" onClick={(e) => { e.preventDefault(); const url = new URL(window.location.href); url.searchParams.set('tab', 'account'); window.location.assign(url) }}>
          {t(lang, 'promoCoveredSettings')}
        </a>
      </p>
    )
  }

  async function change(next: boolean) {
    setAllowed(next)
    setBusy(true)
    setFailed(false)
    try {
      const { error } = await answerSessionPromo(sessionId, next)
      if (error) throw new Error(error)
      router.refresh()
    } catch {
      setAllowed(!next)
      setFailed(true)
    } finally { setBusy(false) }
  }

  return (
    <div className="promo-toggle">
      <label className="setting-row">
        <span className="promo-toggle-label">{t(lang, 'promoGameToggle', { venue: venueName })}</span>
        <span className="switch">
          <input type="checkbox" checked={allowed} disabled={busy} onChange={(e) => void change(e.target.checked)} />
          <span className="switch-track" />
        </span>
      </label>
      {failed && <p role="alert" className="form-note form-note--error">{t(lang, 'promoSaveFailed')}</p>}
    </div>
  )
}
