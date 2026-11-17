'use server'

// Server Actions for the self-serve check-in flow on this page. Each uses
// the cookie-authenticated server client (lib/supabaseServer.ts), so
// auth.uid() inside the RPCs is enforced by the real session, never by
// anything the client claims. Filming consent is recorded at signup
// (lib/player.ts recordSignupConsent), not here.
import { createClient } from '@/lib/supabaseServer'

// Training consent is opt-out and never gates check-in. Always called with the
// checkbox's actual state (true or false), not skipped when unchecked --
// an explicit "no" on record is more useful than no row existing at all.
export async function setTrainingConsent(consented: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_training_consent', { p_consented: consented })
  return { error: error?.message ?? null }
}

// Promotion consent is opt-in: no row means off. The source says where the tick
// came from ('account' here, 'claim' from the claim card; 'signup' is written
// by lib/player.ts recordSignupPromoConsent).
export async function setPromoConsent(consented: boolean, source: 'account' | 'claim') {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_promo_consent', { p_consented: consented, p_source: source })
  return { error: error?.message ?? null }
}

// One game's answer; the database refuses a player who isn't in that game.
export async function answerSessionPromo(scheduleSessionId: string, allowed: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('answer_session_promo', { p_session_id: scheduleSessionId, p_allowed: allowed })
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

// Any player in a walk-up session may end it early (operator 2026-11-16;
// enforced by player_end_check_in itself, not just this action) -- frees the camera
// immediately for the next check-in instead of leaving it falsely "busy"
// until whatever end time was originally picked.
export async function endCheckIn(scheduleSessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('player_end_check_in', { p_schedule_session_id: scheduleSessionId })
  return { error: error?.message ?? null }
}

// Extends or shortens an already-running check-in to a new future end
// time. Unlike endCheckIn, this has to reach the venue machine for real
// (player_update_check_in_end queues update_recording_end) -- won't take
// effect on a real camera until that desktop release ships.
export async function updateCheckInEnd(scheduleSessionId: string, newEndsAtISO: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('player_update_check_in_end', {
    p_schedule_session_id: scheduleSessionId,
    p_new_ends_at: newEndsAtISO,
  })
  return { error: error?.message ?? null }
}

// Leaves a session the player joined by mistake (operator 2026-11-16). The
// database refuses it for the last player of a walk-up session still
// recording ('last_player'): they end it instead.
export async function leaveCheckIn(scheduleSessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('player_leave_check_in', { p_schedule_session_id: scheduleSessionId })
  return { error: error?.message ?? null }
}
