// Google sign-in handled on our own address (operator 2026-11-20): Google's
// screen then names share.picvisionai.com, and PicVision once the brand is
// verified, instead of the Supabase project address. We run the Google code
// flow ourselves and hand Supabase the ID token (signInWithIdToken).

export const GOOGLE_STATE_COOKIE = 'pv_google_signin'

export type GoogleSignInState = {
  state: string
  nonce: string
  next: string
  consent: boolean
  promo: boolean
  // When this sign-in started (ms), so a second start right after can reuse it.
  at: number
  // Set once the player is signed in, so a duplicate return just continues.
  done: boolean
}

// A browser sometimes sends one tap to /auth/google/start twice; both then
// come back from Google. Reusing a sign-in this fresh gives them the same
// state, so the second return is recognised instead of failing.
export const REUSE_WITHIN_MS = 30_000

export function reusableState(existing: GoogleSignInState | null, next: string, now: number): GoogleSignInState | null {
  return existing && !existing.done && existing.next === next && now - existing.at < REUSE_WITHIN_MS ? existing : null
}

export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export function googleAuthUrl({ clientId, redirectUri, state, nonceHash, selectAccount }: {
  clientId: string; redirectUri: string; state: string; nonceHash: string; selectAccount: boolean
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Supabase checks the token's nonce against the hash of the raw nonce we pass it.
    nonce: nonceHash,
    ...(selectAccount ? { prompt: 'select_account' } : {}),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function encodeState(s: GoogleSignInState): string {
  return JSON.stringify(s)
}

/** The cookie's contents, or null when missing or malformed. */
export function parseState(cookieValue: string | undefined): GoogleSignInState | null {
  if (!cookieValue) return null
  try {
    const s = JSON.parse(cookieValue) as Partial<GoogleSignInState>
    if (typeof s.state !== 'string' || typeof s.nonce !== 'string') return null
    return {
      state: s.state, nonce: s.nonce, next: safeNext(s.next), consent: s.consent === true, promo: s.promo === true,
      at: typeof s.at === 'number' ? s.at : 0, done: s.done === true,
    }
  } catch {
    return null
  }
}

/** The cookie's contents, or null when missing, malformed, or for a different sign-in than `returnedState`. */
export function readState(cookieValue: string | undefined, returnedState: string | null): GoogleSignInState | null {
  const s = parseState(cookieValue)
  return s && returnedState && s.state === returnedState ? s : null
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
