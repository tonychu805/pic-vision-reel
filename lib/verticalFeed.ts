// The share page's default view (operator, 2026-10-28: "make the vertical
// version the default"): the session's rally clips as a full-screen 9:16
// feed, in the page's own order (lib/mergeParts.ts -- badged first).
//
// Each clip plays the venue desktop's 9:16 crop of its high-res recording
// when that has arrived (pic-vision desktop/electron/verticalCrop.js), and
// its ordinary 16:9 clip, fitted inside the frame, until then: a clip's crop
// lands a minute or two after the clip itself, so during and just after a
// game some clips are still wide. A share with no crop at all (an older
// desktop, a session from before 10-28) keeps the wide page.

export type FeedReel = { id: string; kind: string; rally_rank: number | null; badge?: string | null; duration_sec: number | null }
export type Addresses = { videos: Record<string, string>; vertical?: Record<string, string> }

export type FeedClip = {
  id: string
  rallyRank: number | null
  badge: string | null
  durationSec: number
  // What plays: the 9:16 crop, else the 16:9 clip.
  videoUrl: string
  // True while only the 16:9 clip exists (shown fitted, not cropped).
  wide: boolean
  // The 16:9 clip as a separate download, when the crop is what plays.
  wideUrl: string | null
}

/** The vertical feed for these (already merged) reels, or null when no clip has a 9:16 crop yet. */
export function verticalFeed(reels: FeedReel[], addresses: Addresses): FeedClip[] | null {
  const vertical = addresses.vertical ?? {}
  const rallies = reels.filter((r) => r.kind === 'rally' && (vertical[r.id] || addresses.videos[r.id]))
  if (!rallies.some((r) => vertical[r.id])) return null
  return rallies.map((r) => clip(r, addresses))
}

/** One clip's addresses -- also how the page swaps in refreshed (or newly arrived) ones. */
export function clip(r: FeedReel, addresses: Addresses): FeedClip {
  const crop = addresses.vertical?.[r.id] ?? null
  const wide = addresses.videos[r.id] ?? null
  return {
    id: r.id,
    rallyRank: r.rally_rank,
    badge: r.badge ?? null,
    durationSec: r.duration_sec ?? 0,
    videoUrl: (crop ?? wide) as string,
    wide: !crop,
    wideUrl: crop ? wide : null,
  }
}
