// Public, read-only client -- the anon key, not the service-role one.
// This page has no logged-in user at all (a share link works for anyone
// who has it), so there's no session/cookie handling to do here, unlike
// pic-vision-cloud-console's lib/supabase/{client,server}.ts.
//
// The anon key can NOT read `reels` directly: the only thing it may call is
// get_reels_by_share_id(uuid) (console migration 20260906120000), a
// SECURITY DEFINER function that returns rows for exactly one share_id.
// The earlier "anyone with the id can read" SELECT policy was USING (true),
// which let the (public, bundled) anon key list every reel in every brand.
import { createClient } from '@supabase/supabase-js'

export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
