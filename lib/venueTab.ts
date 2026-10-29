export type CalendarTab = 'checkin' | 'sessions' | 'account'

// The venue page's ?tab= value. Named after what the player sees
// (Highlights), not the internal 'sessions'; check-in is the default and has
// no parameter.
const TO_PARAM: Record<CalendarTab, string | null> = { checkin: null, sessions: 'highlights', account: 'account' }

export function tabParam(tab: CalendarTab): string | null {
  return TO_PARAM[tab]
}

/** The tab a ?tab= value names; anything unknown is check-in. */
export function tabFromParam(value: string | string[] | undefined): CalendarTab {
  const v = Array.isArray(value) ? value[0] : value
  return v === 'highlights' ? 'sessions' : v === 'account' ? 'account' : 'checkin'
}
