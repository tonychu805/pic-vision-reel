// The venue page a player last opened (/<slug>/<code>), kept in this browser
// so the standalone /account page can offer the same bottom bar: its 報到 and
// 精華 tabs need a venue to open (operator 2026-11-16). Per browser only, and
// optional: storage can be unavailable, and then those tabs are shown off.
const KEY = 'pv:lastVenue'
const VENUE_PATH = /^\/[a-z0-9][a-z0-9-]{1,31}\/[a-z0-9]{8,64}(\?court=[0-9a-f-]{36})?$/i

export function rememberVenue(path: string): void {
  if (!VENUE_PATH.test(path)) return
  try { window.localStorage.setItem(KEY, path) } catch { /* private mode, blocked storage */ }
}

export function lastVenue(): string | null {
  try {
    const v = window.localStorage.getItem(KEY)
    return v && VENUE_PATH.test(v) ? v : null
  } catch {
    return null
  }
}
