'use server'

// Server Actions for the self-serve check-in flow on this page. Each uses
// the cookie-authenticated server client (lib/supabaseServer.ts), so
// auth.uid() inside the RPCs is enforced by the real session, never by
// anything the client claims. IP/user-agent for the consent record are
// read from request headers here -- server-side, never trusted from the
// browser -- per the plan's evidentiary-strength requirement.
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'

function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

export async function recordConsent(filmingConsent: boolean, retentionPolicyAccepted: boolean) {
  const h = await headers()
  const supabase = await createClient()
  const { error } = await supabase.rpc('record_player_consent', {
    p_filming_consent: filmingConsent,
    p_retention_policy_accepted: retentionPolicyAccepted,
    p_ip_address: clientIp(h),
    p_user_agent: h.get('user-agent'),
  })
  return { error: error?.message ?? null }
}

export async function checkIn(slug: string, code: string, cameraRowId: string, endsAtISO: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('player_check_in', { p_slug: slug, p_code: code, p_camera_row_id: cameraRowId, p_ends_at: endsAtISO })
    .single()
  return { data: data as { schedule_session_id: string; ends_at: string } | null, error: error?.message ?? null }
}

export async function joinCheckIn(scheduleSessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('player_join_check_in', { p_schedule_session_id: scheduleSessionId })
  return { error: error?.message ?? null }
}
