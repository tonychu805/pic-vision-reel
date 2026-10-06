'use client'

// Fixed bottom tab bar for the venue QR-code page: check-in and today's
// games are both already rendered server-side by page.tsx (via
// CalendarTabs, which just toggles their visibility client-side), while
// Account is a real navigation to the existing /account page -- it has
// its own data and isn't part of this page's server fetch.
import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'

export type CalendarTab = 'checkin' | 'sessions'

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
      <Link href="/account" className="bottom-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
        <span>{t(lang, 'navAccount')}</span>
      </Link>
    </nav>
  )
}
