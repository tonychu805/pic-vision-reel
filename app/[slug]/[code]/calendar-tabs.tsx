'use client'

// Splits the venue page's already-server-rendered check-in panel and
// games list into two bottom-nav tabs. Both stay mounted (display:none
// on the inactive one, not unmounted) -- CheckinPanel polls while a
// check-in is pending (see its own comment), and that should keep
// running even while the visitor is looking at Sessions, not restart
// every time they switch back.
import { useState, type ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import BottomNav, { type CalendarTab } from './bottom-nav'

export default function CalendarTabs({ lang, checkin, sessions }: { lang: Lang; checkin: ReactNode; sessions: ReactNode }) {
  const [tab, setTab] = useState<CalendarTab>('checkin')
  return (
    <>
      <div style={{ display: tab === 'checkin' ? 'contents' : 'none' }}>{checkin}</div>
      <div style={{ display: tab === 'sessions' ? 'contents' : 'none' }}>{sessions}</div>
      {/* Matches .bottom-nav's real rendered height so fixed positioning never covers scrolled content. */}
      <div style={{ height: 58 }} aria-hidden="true" />
      <BottomNav lang={lang} active={tab} onSelect={setTab} />
    </>
  )
}
