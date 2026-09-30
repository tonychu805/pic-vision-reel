// Server-side Supabase client for a signed-in player's session (cookie-
// based), used from Server Components and Server Actions in
// app/[slug]/[code]/*. Mirrors pic-vision-cloud-console's
// lib/supabase/server.ts, including the same setAll() no-op-in-render
// caveat: called from a Server Component render there's no response to
// attach cookies to, which is harmless as long as the write path (Server
// Actions in actions.ts) also runs this same helper, since Server Actions
// CAN set cookies.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

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
