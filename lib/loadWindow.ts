// Which slides' videos to download, and when.
//
// History: the page first fetched every slide at once (about 56 MB for a
// 12-slide session on the 9/25 field test), then from 2026-09-28 only the
// slide on screen and the next one. On 2026-11-22 the operator chose to
// have every clip ready again: Share waited on a download after each quick
// swipe. The clip on screen and the next still go first, together; the
// rest follow one at a time, so they never slow the clip being watched.

export function slidesToLoad(active: number, count: number): number[] {
  return [active, active + 1].filter((i) => i >= 0 && i < count)
}

/**
 * The next slide to fetch in the background, or null. Only when nothing is
 * downloading; clips after the one on screen first, then the ones before.
 * `skip`: already fetched, on their way, failed, or not worth fetching.
 */
export function nextToPrefetch(active: number, count: number, inFlight: number, skip: (i: number) => boolean): number | null {
  if (inFlight > 0) return null
  for (let k = 1; k < count; k++) {
    const i = (active + k) % count
    if (!skip(i)) return i
  }
  return null
}
