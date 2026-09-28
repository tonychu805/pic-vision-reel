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
// A share with no parts, or a single part, is returned untouched.

export type PartReel = { kind: string; rally_rank: number | null; part_index: number | null; score?: number | string | null }

const scoreOf = (r: PartReel) => (r.score === null || r.score === undefined || r.score === '' ? NaN : Number(r.score))

export const MAX_RALLIES = 10

export function mergeParts<T extends PartReel>(reels: T[]): T[] {
  const parts = [...new Set(reels.map((r) => r.part_index).filter((p): p is number => p !== null))].sort((a, b) => a - b)
  if (parts.length <= 1) return reels

  const partRallies = reels.filter((r) => r.kind === 'rally' && r.part_index !== null)
  const scored = partRallies.length > 0 && partRallies.every((r) => Number.isFinite(scoreOf(r)))
  const rallies = partRallies
    .sort(scored
      ? (a, b) => scoreOf(b) - scoreOf(a) || (a.part_index as number) - (b.part_index as number)
      : (a, b) => (a.rally_rank ?? 99) - (b.rally_rank ?? 99) || (a.part_index as number) - (b.part_index as number))
    .slice(0, MAX_RALLIES)
    .map((r, i) => ({ ...r, rally_rank: i + 1 }))

  const newest = parts[parts.length - 1]
  const extras = ['burst', 'full']
    .map((kind) => reels.find((r) => r.kind === kind && r.part_index === newest))
    .filter((r): r is T => r !== undefined)

  return [...rallies, ...extras]
}
