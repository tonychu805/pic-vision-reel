// What players do on a share page, counted per session with no names
// (operator 2026-11-22). The venue sees the totals on the console's Reels
// page. Nothing here identifies a viewer: no id, cookie or stored value on
// the phone. Each event is just "this happened on this session's page",
// written by app/api/activity through the database's record_share_event().
// A failed send is dropped; the page never waits on it.

export const ACTIVITY_KINDS = ['page_open', 'clip_view', 'clip_share', 'link_share', 'download'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export type ActivityEvent = { shareId: string; kind: ActivityKind; reelId: string | null; viaShare: boolean }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The event in a request body, or null when it isn't one. */
export function parseActivity(body: unknown): ActivityEvent | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.shareId !== 'string' || !UUID_RE.test(b.shareId)) return null
  if (!(ACTIVITY_KINDS as readonly unknown[]).includes(b.kind)) return null
  const reelId = typeof b.reelId === 'string' && UUID_RE.test(b.reelId) ? b.reelId : null
  if (b.reelId != null && reelId === null) return null
  return { shareId: b.shareId, kind: b.kind as ActivityKind, reelId, viaShare: b.viaShare === true }
}

// A link a player shares carries ?from=share, so an open through it counts
// as "opened by someone they sent it to".
const FROM_PARAM = 'from'
const FROM_SHARE = 'share'

export function sharedLink(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set(FROM_PARAM, FROM_SHARE)
    return u.toString()
  } catch {
    return url
  }
}

export function openedFromShare(search: string): boolean {
  return new URLSearchParams(search).get(FROM_PARAM) === FROM_SHARE
}

/** Seconds a clip has to play before it counts as watched. */
export function viewThreshold(durationSec: number): number {
  return Math.min(3, durationSec / 2)
}

export function recordActivity(shareId: string | undefined, kind: ActivityKind, reelId?: string | null, viaShare = false) {
  if (!shareId || typeof navigator === 'undefined') return
  const body = JSON.stringify({ shareId, kind, reelId: reelId ?? null, viaShare })
  try {
    if (navigator.sendBeacon?.('/api/activity', new Blob([body], { type: 'application/json' }))) return
  } catch {
    // fall through to fetch
  }
  fetch('/api/activity', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
}
