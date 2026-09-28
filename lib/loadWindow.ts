// Which slides' videos to download now (2026-09-28). The page used to fetch
// every slide the moment it opened -- about 56 MB for a 12-slide session on
// the 9/25 field test -- so share tiles could hand Safari a finished file
// inside its tap window. Now only the slide on screen and the next one are
// fetched; each swipe fetches one more. A tile tapped on a slide still
// loading shows its spinner, as before.
export function slidesToLoad(active: number, count: number): number[] {
  return [active, active + 1].filter((i) => i >= 0 && i < count)
}
