const VENUE_PATH_RE = /^\/([a-z0-9][a-z0-9-]{1,31})\/[a-z0-9]{8,64}(?:[/?#]|$)/i

// The venue slug of a /[slug]/[code] path (the `next` a signup carries), or
// null for anything else: other routes, a bare slug, a full URL, non-strings.
export function venueSlugFromNext(next: unknown): string | null {
  if (typeof next !== 'string') return null
  return VENUE_PATH_RE.exec(next)?.[1] ?? null
}
