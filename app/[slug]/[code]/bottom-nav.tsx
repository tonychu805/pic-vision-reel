'use client'

// Fixed bottom tab bar for the venue QR-code page: check-in, today's
// games, and the account form are all already rendered server-side by
// page.tsx (via CalendarTabs, which just toggles visibility client-side
// between the three) -- this bar only switches which one shows, same as
// any other tab bar. (The standalone /account page still exists
// separately -- it's the fallback landing page for login/signup/consent
// when there's no venue `next` to return to -- this tab just means a
// visitor who got here via a venue's QR code never has to leave this
// page to see it.)
import type { JSX } from 'react'
import { t, type Lang } from '@/lib/i18n'

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
