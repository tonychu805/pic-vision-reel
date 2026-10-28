// A playing session sent in parts (pic-vision ADR-127/128) arrives here as
// several sets of reels on one share link. Players see the same page as
// ever, so this turns them back into one familiar set:
//   - rally clips: the session's best MAX_RALLIES, renumbered 1..n. When
//     every rally clip carries its 0-100 score (pic-vision ADR-133, clips
//     made from 2026-09-28), that means the highest scores across all
//     parts. Older sessions have none, so they keep the earlier order: each
//     part's #1, then each part's #2, ...;
//   - then the newest part's quick hits and full reel.
// That keeps the carousel at today's size (~12 short clips), which keeps
// "Download all" to a sensible size (see reel-share-client.tsx).
//
// Badged clips come first, always shown, then the best of the rest fill the
// page to MAX_RALLIES (operator, 2026-10-27: badged highlights first, then
// the ranked rest, then quick hits). A badge is decided across the whole
// session, so with badges on every part sends ALL its rallies as clips; this
// is also what trims those to one page, even for a single part.
//
// A share with no parts or a single part, no badges and no more than
// MAX_RALLIES clips is returned untouched.

export type PartReel = {
  kind: string
  rally_rank: number | null
  part_index: number | null
  score?: number | string | null
  badge?: string | null
}

const scoreOf = (r: PartReel) => (r.score === null || r.score === undefined || r.score === '' ? NaN : Number(r.score))

export const MAX_RALLIES = 10

export function mergeParts<T extends PartReel>(reels: T[]): T[] {
  const parts = [...new Set(reels.map((r) => r.part_index).filter((p): p is number => p !== null))].sort((a, b) => a - b)
  const allRallies = reels.filter((r) => r.kind === 'rally')
  if (parts.length <= 1 && !allRallies.some((r) => r.badge) && allRallies.length <= MAX_RALLIES) return reels

  // Before parts (part_index null) the share is one set; after, only
  // part clips count, as always.
  const partRallies = parts.length ? allRallies.filter((r) => r.part_index !== null) : allRallies
  const scored = partRallies.length > 0 && partRallies.every((r) => Number.isFinite(scoreOf(r)))
  const order = scored
    ? (a: T, b: T) => scoreOf(b) - scoreOf(a) || (a.part_index ?? 0) - (b.part_index ?? 0)
    : (a: T, b: T) => (a.rally_rank ?? 99) - (b.rally_rank ?? 99) || (a.part_index ?? 0) - (b.part_index ?? 0)
  const badged = partRallies.filter((r) => r.badge).sort(order)
  const rest = partRallies.filter((r) => !r.badge).sort(order)
  const rallies = [...badged, ...rest]
    .slice(0, Math.max(MAX_RALLIES, badged.length))
    .map((r, i) => ({ ...r, rally_rank: i + 1 }))

  const newest = parts.length ? parts[parts.length - 1] : null
  const extras = ['burst', 'full']
    .map((kind) => reels.find((r) => r.kind === kind && r.part_index === newest))
    .filter((r): r is T => r !== undefined)

  return [...rallies, ...extras]
}
