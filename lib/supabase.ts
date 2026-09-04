// Public, read-only client -- the anon key, not the service-role one.
// This page has no logged-in user at all (a share link works for anyone
// who has it), so there's no session/cookie handling to do here, unlike
// pic-vision-cloud-console's lib/supabase/{client,server}.ts. Access is
// entirely governed by reels' own "anyone with the id can read" RLS
// policy (2026-09-04 migration) -- the anon key can only ever see what
// that policy allows, which is exactly the point.
import { createClient } from '@supabase/supabase-js'

export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
