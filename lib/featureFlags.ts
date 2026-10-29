// PostHog feature flags, evaluated on the server (2026-10-29, first use:
// share-sound-button). Deliberately not posthog-js: that would put a tracker
// on the page players open, with its own consent questions. Here the share
// site asks PostHog once a minute, with one fixed anonymous id, so no player,
// cookie or device id ever reaches PostHog -- which also means flags here are
// on/off for everyone, never per person.
//
// Fails closed: no answer (PostHog down, slow, or the flag switched off)
// means false.

// The project's public key -- meant to be embedded in client code, same as
// pic-vision/desktop/electron/analytics.js and the console's
// NEXT_PUBLIC_POSTHOG_KEY. One PicVision project holds every app's flags.
const POSTHOG_KEY = process.env.POSTHOG_PROJECT_KEY || 'phc_yFZ9XpfLSFhVRphmi4cAVf9rdxfrBPjTnLJpi4ZnAACn'
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com'
const DISTINCT_ID = 'share-site-server'
export const FLAG_TTL_MS = 60_000
const TIMEOUT_MS = 1500

type Snapshot = { at: number; flags: Record<string, boolean> }
let cached: Snapshot | null = null

export async function isFlagOn(key: string, deps: { fetch?: typeof fetch; now?: () => number } = {}): Promise<boolean> {
  const now = deps.now ?? Date.now
  if (!cached || now() - cached.at >= FLAG_TTL_MS) {
    try {
      const res = await (deps.fetch ?? fetch)(`${POSTHOG_HOST}/flags?v=2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: POSTHOG_KEY, distinct_id: DISTINCT_ID }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`flags: HTTP ${res.status}`)
      const body = (await res.json()) as { flags?: Record<string, { enabled?: boolean }> }
      cached = { at: now(), flags: Object.fromEntries(Object.entries(body.flags ?? {}).map(([k, v]) => [k, v?.enabled === true])) }
    } catch {
      // Keep the last good answer if there is one; otherwise everything is off.
      if (!cached) return false
    }
  }
  return cached.flags[key] === true
}

/** Tests only. */
export function resetFlagCache() {
  cached = null
}
