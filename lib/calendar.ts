// The venue's public game calendar page (/<slug>/<code>): groups today's
// games by court for display. Data comes from the console database's
// get_public_calendar, which returns nothing unless the calendar is on.

export type CalendarGame = { court: string; started_at: string; ends_at: string | null; share_id: string | null }
export type CourtGames = { court: string; games: CalendarGame[] }

/** Courts in name order ("Court 2" before "Court 10"), each with its games, newest first. */
export function byCourt(games: CalendarGame[]): CourtGames[] {
  const map = new Map<string, CalendarGame[]>()
  for (const g of games) map.set(g.court, [...(map.get(g.court) ?? []), g])
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([court, list]) => ({ court, games: [...list].sort((x, y) => y.started_at.localeCompare(x.started_at)) }))
}

/** "14:00–15:00", or "14:03" for a game with no booked end, in the venue's time. */
export function slotLabel(g: CalendarGame, timeZone: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' })
  return g.ends_at ? `${fmt(g.started_at)}–${fmt(g.ends_at)}` : fmt(g.started_at)
}

/** Today's date in the venue's time, e.g. "Thu 24 Sep". */
export function dateLabel(now: Date, timeZone: string): string {
  return now.toLocaleDateString('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' })
}
