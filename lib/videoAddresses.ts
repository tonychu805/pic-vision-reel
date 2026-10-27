// Where the share page gets its video addresses (2026-09-29, pic-vision
// ADR-142).
//
// Reels live in a private bucket now. The console hands out signed addresses
// that last an hour, and only while this share link is under 30 days old
// (console: app/api/share/[shareId]/videos). This page asks when it renders,
// and the browser asks again shortly before they run out -- so a page left
// open keeps playing, while an address copied out of it dies within the hour.

export const CONSOLE_URL = (process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'https://console.picvisionai.com').replace(/\/$/, '')

export function videosEndpoint(shareId: string): string {
  return `${CONSOLE_URL}/api/share/${shareId}/videos`
}

// vertical: the 9:16 copies the venue desktop cropped from its high-res
// recording (2026-10-27), for the clips that have one; absent from an older
// console.
export type VideoAddresses = { expiresAt: string; videos: Record<string, string>; vertical?: Record<string, string> }

/**
 * The share's current addresses, or null when the console says the share is
 * unknown, removed or past 30 days (404). Anything else -- the console
 * unreachable, a 5xx -- throws, so it is not mistaken for "this link expired".
 */
export async function fetchVideoAddresses(shareId: string): Promise<VideoAddresses | null> {
  const res = await fetch(videosEndpoint(shareId), { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`video addresses: HTTP ${res.status}`)
  return (await res.json()) as VideoAddresses
}

// Refresh this long before the addresses run out, so a load or a download
// never starts on an address about to expire.
export const REFRESH_BEFORE_MS = 5 * 60 * 1000

/** Time to ask for fresh addresses? Pure, for the test. */
export function needsRefresh(expiresAt: string, now: number = Date.now()): boolean {
  const at = Date.parse(expiresAt)
  return !Number.isFinite(at) || now >= at - REFRESH_BEFORE_MS
}
