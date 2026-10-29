'use client'

// Splits the venue page's already-server-rendered check-in panel, games
// list, and account form into three bottom-nav tabs. All three stay
// mounted (display:none on the inactive ones, not unmounted) --
// CheckinPanel polls while a check-in is pending (see its own comment),
// and that should keep running even while the visitor is on another tab,
// not restart every time they switch back.
import { useState, type ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import PoweredByFooter from '@/components/powered-by-footer'
import BottomNav, { type CalendarTab } from './bottom-nav'
import { tabParam } from '@/lib/venueTab'

// The open tab is also kept in the address (?tab=highlights|account,
// 2026-10-29): it used to live only in component state, so watching a reel
// and pressing back reloaded the page on 報到. replaceState, not a router
// push -- switching tabs adds no history entries and re-renders nothing on
// the server; page.tsx reads the parameter on the way back in.
export default function CalendarTabs({ lang, checkin, sessions, account, initialTab = 'checkin' }: { lang: Lang; checkin: ReactNode; sessions: ReactNode; account: ReactNode; initialTab?: CalendarTab }) {
  const [tab, setTabState] = useState<CalendarTab>(initialTab)
  const setTab = (next: CalendarTab) => {
    setTabState(next)
    const url = new URL(window.location.href)
    const value = tabParam(next)
    if (value) url.searchParams.set('tab', value)
    else url.searchParams.delete('tab')
    window.history.replaceState(window.history.state, '', url)
  }
  return (
    <>
      <div style={{ display: tab === 'checkin' ? 'contents' : 'none' }}>{checkin}</div>
      <div style={{ display: tab === 'sessions' ? 'contents' : 'none' }}>{sessions}</div>
      <div style={{ display: tab === 'account' ? 'contents' : 'none' }}>{account}</div>
      <PoweredByFooter lang={lang} />
      {/* Matches .bottom-nav's real rendered height so fixed positioning never covers scrolled content. */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-bottom))', flex: 'none' }} aria-hidden="true" />
      <BottomNav lang={lang} active={tab} onSelect={setTab} />
    </>
  )
}
