'use client'

// Fixed bottom tab bar for the venue QR-code page: check-in, today's
// games, and the account form are all already rendered server-side by
// page.tsx (via CalendarTabs, which just toggles visibility client-side
// between the three) -- this bar only switches which one shows, same as
// any other tab bar. (The standalone /account page still exists
// separately -- it's the fallback landing page for login/signup
// when there's no venue `next` to return to -- this tab just means a
// visitor who got here via a venue's QR code never has to leave this
// page to see it.)
import { useEffect, useState, type JSX } from 'react'
import { t, type Lang } from '@/lib/i18n'
import { tabParam } from '@/lib/venueTab'
import { lastVenue } from '@/lib/lastVenue'

import type { CalendarTab } from '@/lib/venueTab'
export type { CalendarTab }

// Clubhouse (2026-10-29): three equal tabs, the active one marked by a
// court-green bar on top. No raised centre button and no sparkle -- the
// highlights tab is a play icon, because that is what it holds.
const ICONS: Record<CalendarTab, JSX.Element> = {
  checkin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M4 12h16" /><path d="m9 7.5 2 2 4-4" />
    </svg>
  ),
  sessions: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9v6l5-3-5-3Z" fill="currentColor" />
    </svg>
  ),
  account: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
}
const LABELS = { checkin: 'navCheckIn', sessions: 'navSessions', account: 'navAccount' } as const

export default function BottomNav({ lang, active, onSelect }: { lang: Lang; active: CalendarTab; onSelect: (tab: CalendarTab) => void }) {
  return (
    <nav className="bottom-nav">
      {(['checkin', 'sessions', 'account'] as const).map((tab) => (
        <button key={tab} type="button" className={`bottom-nav-item${active === tab ? ' active' : ''}`} aria-current={active === tab ? 'page' : undefined} onClick={() => onSelect(tab)}>
          {ICONS[tab]}
          <span>{t(lang, LABELS[tab])}</span>
        </button>
      ))}
    </nav>
  )
}

/**
 * The same bar on the standalone /account page (operator 2026-11-16: no "back" link, the bar instead). 報到 and
 * 精華 open the venue this player last opened; with none known in this browser they are shown off.
 */
export function AccountBottomNav({ lang }: { lang: Lang }) {
  const [venue, setVenue] = useState<string | null>(null)
  useEffect(() => setVenue(lastVenue()), [])
  return (
    <nav className="bottom-nav">
      {(['checkin', 'sessions', 'account'] as const).map((tab) => {
        const body = <>{ICONS[tab]}<span>{t(lang, LABELS[tab])}</span></>
        if (tab === 'account') return <span key={tab} className="bottom-nav-item active" aria-current="page">{body}</span>
        if (!venue) return <span key={tab} className="bottom-nav-item bottom-nav-item--off" aria-disabled="true">{body}</span>
        const param = tabParam(tab)
        return <a key={tab} className="bottom-nav-item" href={param ? `${venue}?tab=${param}` : venue}>{body}</a>
      })}
    </nav>
  )
}
