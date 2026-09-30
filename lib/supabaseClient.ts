// Browser-side Supabase client for a signed-in PLAYER session -- distinct
// from lib/supabase.ts's supabasePublic(), which stays anon-key-only and
// unauthenticated for the existing share/calendar reads. Named
// supabaseClient.ts rather than a supabase/client.ts directory to avoid
// colliding with the existing lib/supabase.ts file. Mirrors
// pic-vision-cloud-console's lib/supabase/client.ts.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
