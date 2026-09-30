'use server'

// One sign-out for both providers -- a GoTrue session (Google/email) and
// an Auth0 session (LINE) are never both present at once, but the caller
// (checkin-panel.tsx, account-form.tsx) doesn't know which one is
// active, so this clears whichever exists instead of each component
// guessing. Never call supabase.auth.signOut() while an Auth0 cookie is
// present -- lib/supabaseServer.ts's createClient() would hand back the
// accessToken-based client in that case, and GoTrue has no idea what to
// do with a foreign Auth0 token.
import { cookies } from 'next/headers'
import { createClient } from './supabaseServer'
import { AUTH0_ID_TOKEN_COOKIE, AUTH0_REFRESH_TOKEN_COOKIE } from './auth0'

export async function signOutEverywhere() {
  const cookieStore = await cookies()
  const hasAuth0Session = cookieStore.has(AUTH0_ID_TOKEN_COOKIE)

  if (!hasAuth0Session) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  cookieStore.delete(AUTH0_ID_TOKEN_COOKIE)
  cookieStore.delete(AUTH0_REFRESH_TOKEN_COOKIE)
}
