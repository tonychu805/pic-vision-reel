// Server-side Supabase client for a signed-in player's session. Two
// providers now share this one function: Google/email (Supabase's own
// GoTrue, cookie-managed) and LINE (Auth0, a bare id-token cookie this
// file just hands to the client as its accessToken -- Auth0 sessions
// were never GoTrue sessions, so there's no cookie dance to replicate,
// just a token to read). Every caller across the app (page.tsx,
// actions.ts, account/, consent/) gets whichever one applies without
// needing to know which provider is signed in.
//
// Mirrors pic-vision-cloud-console's lib/supabase/server.ts for the
// GoTrue branch, including the same setAll() no-op-in-render caveat:
// called from a Server Component render there's no response to attach
// cookies to, which is harmless as long as the write path (Server
// Actions in actions.ts) also runs this same helper, since Server
// Actions CAN set cookies.
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { AUTH0_ID_TOKEN_COOKIE } from './auth0'

export async function createClient() {
  const cookieStore = await cookies()

  const auth0IdToken = cookieStore.get(AUTH0_ID_TOKEN_COOKIE)?.value
  if (auth0IdToken) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { accessToken: async () => auth0IdToken },
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component render, not a Route Handler/Server Action -- no response to attach to.
          }
        },
      },
    },
  )
}
