// A playing session sent in parts (pic-vision ADR-127/128) arrives here as
// several sets of reels on one share link. Players see the same page as
// ever, so this turns them back into one familiar set:
//   - rally clips: every part's best first -- each part's #1, then each
//     part's #2, ... -- up to MAX_RALLIES, renumbered 1..n in that order;
//   - then the newest part's quick hits and full reel.
// That keeps the carousel at today's size (~12 short clips), which matters:
// the page prefetches every slide it shows (see reel-share-client.tsx).
//
// A share with no parts, or a single part, is returned untouched.

export type PartReel = { kind: string; rally_rank: number | null; part_index: number | null }

export const MAX_RALLIES = 10

export function mergeParts<T extends PartReel>(reels: T[]): T[] {
  const parts = [...new Set(reels.map((r) => r.part_index).filter((p): p is number => p !== null))].sort((a, b) => a - b)
  if (parts.length <= 1) return reels

  const rallies = reels
    .filter((r) => r.kind === 'rally' && r.part_index !== null)
    .sort((a, b) => (a.rally_rank ?? 99) - (b.rally_rank ?? 99) || (a.part_index as number) - (b.part_index as number))
    .slice(0, MAX_RALLIES)
    .map((r, i) => ({ ...r, rally_rank: i + 1 }))

  const newest = parts[parts.length - 1]
  const extras = ['burst', 'full']
    .map((kind) => reels.find((r) => r.kind === kind && r.part_index === newest))
    .filter((r): r is T => r !== undefined)

  return [...rallies, ...extras]
}
