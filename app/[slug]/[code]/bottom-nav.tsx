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
import { t, type Lang } from '@/lib/i18n'

export type CalendarTab = 'checkin' | 'sessions' | 'account'

export default function BottomNav({ lang, active, onSelect }: { lang: Lang; active: CalendarTab; onSelect: (tab: CalendarTab) => void }) {
  return (
    <nav className="bottom-nav">
      <button type="button" className={`bottom-nav-item${active === 'checkin' ? ' active' : ''}`} onClick={() => onSelect('checkin')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>{t(lang, 'navCheckIn')}</span>
      </button>
      <button type="button" className={`bottom-nav-item${active === 'sessions' ? ' active' : ''}`} onClick={() => onSelect('sessions')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{t(lang, 'navSessions')}</span>
      </button>
      <button type="button" className={`bottom-nav-item${active === 'account' ? ' active' : ''}`} onClick={() => onSelect('account')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
        <span>{t(lang, 'navAccount')}</span>
      </button>
    </nav>
  )
}
