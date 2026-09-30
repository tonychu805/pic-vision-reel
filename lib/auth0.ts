// Shared between app/auth/line-callback/route.ts (sets these cookies),
// proxy.ts (refreshes them), lib/supabaseServer.ts (reads the id token to
// build a third-party-auth Supabase client) and lib/auth-actions.ts
// (clears them on sign-out) -- one place so the two cookie names can't
// drift out of sync across those four call sites.
export const AUTH0_ID_TOKEN_COOKIE = 'auth0_id_token'
export const AUTH0_REFRESH_TOKEN_COOKIE = 'auth0_refresh_token'

export type Auth0Tokens = {
  id_token: string
  refresh_token?: string
  expires_in: number
}

// Server-only: AUTH0_CLIENT_SECRET must never reach the browser. Used by
// both the initial code exchange (line-callback) and later refreshes
// (proxy.ts), which is why this lives here instead of inline in either.
export async function exchangeAuth0Token(
  body: Record<string, string>,
): Promise<Auth0Tokens | null> {
  const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      ...body,
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<Auth0Tokens>
}

// The id token's sub/name claims, read without signature verification --
// it came straight from Auth0's own token endpoint over TLS in the same
// request, never from anything a client could have forged.
export function decodeAuth0IdToken(idToken: string): { sub: string; name?: string } {
  const payload = idToken.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}
