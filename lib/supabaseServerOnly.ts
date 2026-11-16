import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client for the few server routes that must read past the
// player rules after their own check (today: the demo-admin session picker,
// after the admin password). Server only: the 'server-only' import makes a
// client-side import a build error, and the key has no NEXT_PUBLIC_ prefix.
export function supabaseServerOnly() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}
