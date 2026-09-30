'use client'

// Self-serve check-in UI, shown on the venue QR-code page above the
// read-only games calendar. The page above this (page.tsx) redirects to
// /login (not signed in) or /consent (no current-version consent) before
// ever rendering this component, so there is nothing to gate on here --
// just per-camera Check in / Join / status, driven by server-provided
// initial props.
//
// No local "I just checked in" state: a successful check-in or join calls
// router.refresh(), and the next server-rendered `options` (is_busy,
// already_joined, participant_count) is what actually drives what's shown
// -- the database is the source of truth, not a client-side flag that
// could drift from it.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import { checkIn, joinCheckIn, endCheckIn } from './actions'

export type CheckInOption = {
  camera_row_id: string
  camera_label: string
  is_busy: boolean
  busy_session_id: string | null
  already_joined: boolean
  participant_count: number
  has_current_consent: boolean
  is_owner: boolean
}

const ERROR_KEYS: Record<string, StringKey> = {
  consent_required: 'consentRequiredError',
  calendar_unavailable: 'calendarUnavailable',
  camera_busy: 'cameraBusyError',
  ends_at_in_past: 'endsAtInPastError',
  ends_at_too_far: 'endsAtTooFarError',
  session_not_active: 'sessionNotActiveError',
  session_full: 'sessionFullError',
}

export default function CheckinPanel({
  lang, slug, code, options,
}: {
  lang: Lang
  slug: string
  code: string
  options: CheckInOption[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [endHour, setEndHour] = useState('')
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM')

  function showError(code: string) {
    setError(t(lang, ERROR_KEYS[code] ?? 'genericError'))
  }

  // Hour (1-12) + AM/PM only -- no minutes anywhere, not even transiently
  // in a picker UI. <input type="time"> was tried first (step=3600 to
  // restrict it to whole hours), but iOS Safari's native wheel ignores
  // that and still offers all 60 minutes (confirmed on a real phone
  // 2026-09-30). Two plain <select>s sidestep the native time-picker
  // entirely: their options are just "1".."12" and AM/PM, so there is no
  // minutes value to ever show or pick.
  //
  // Interpreted in the browser's own local time -- a player is physically
  // at the venue, so their phone's timezone is the venue's timezone in
  // the overwhelming common case. Rolls to tomorrow if the picked hour
  // has already passed today.
  function endTimeToISO(hour12: string, period: 'AM' | 'PM'): string | null {
    const h12 = Number(hour12)
    if (!Number.isInteger(h12) || h12 < 1 || h12 > 12) return null
    const hour24 = (h12 % 12) + (period === 'PM' ? 12 : 0)
    const d = new Date()
    d.setHours(hour24, 0, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
    return d.toISOString()
  }

  async function doCheckIn(cameraRowId: string) {
    const endsAtISO = endTimeToISO(endHour, endPeriod)
    if (!endsAtISO) { setError(t(lang, 'pickEndTimeError')); return }
    setBusy(cameraRowId)
    setError(null)
    const { error } = await checkIn(slug, code, cameraRowId, endsAtISO)
    setBusy(null)
    if (error) { showError(error); return }
    router.refresh()
  }

  async function doJoin(sessionId: string) {
    setBusy(sessionId)
    setError(null)
    const { error } = await joinCheckIn(sessionId)
    setBusy(null)
    if (error) { showError(error); return }
    router.refresh()
  }

  // Frees the camera immediately (real stop command, not just a database
  // flag) rather than leaving it falsely "busy" until whatever end time
  // was originally picked -- only the player who checked in sees this,
  // enforced by player_end_check_in itself.
  async function doEnd(sessionId: string) {
    setBusy(sessionId)
    setError(null)
    const { error } = await endCheckIn(sessionId)
    setBusy(null)
    if (error) { showError(error); return }
    router.refresh()
  }

  async function signOut() {
    await createClient().auth.signOut()
    // A full reload, not a router refresh: the server component that
    // fetches `options` (page.tsx) needs to re-read the now-cleared
    // session cookie from scratch.
    window.location.reload()
  }

  const signOutLink = (
    <button
      onClick={signOut}
      style={{ background: 'none', border: 'none', padding: 0, marginTop: 8, color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}
    >
      {t(lang, 'signOut')}
    </button>
  )

  const anyFree = options.some((o) => !o.is_busy)
  return (
    <section className="calendar-court">
      <h2>{t(lang, 'checkInTitle')}</h2>
      {!anyFree && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{t(lang, 'checkInNoneFree')}</p>}
      {anyFree && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, marginBottom: 8 }}>
          {t(lang, 'checkInEndTimeLabel')}
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={endHour} onChange={(e) => setEndHour(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid var(--divider)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 14 }}
            >
              <option value="" disabled>--</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={endPeriod} onChange={(e) => setEndPeriod(e.target.value as 'AM' | 'PM')}
              style={{ padding: '8px 10px', border: '1px solid var(--divider)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 14 }}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      )}
      {options.map((o) => {
        if (!o.is_busy) {
          return (
            <button
              key={o.camera_row_id}
              className="calendar-slot"
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={busy === o.camera_row_id}
              onClick={() => doCheckIn(o.camera_row_id)}
            >
              <span>{o.camera_label}</span>
              <span className="calendar-slot-go">{t(lang, 'checkInStart')}</span>
            </button>
          )
        }
        if (o.busy_session_id && o.is_owner) {
          return (
            <button
              key={o.camera_row_id}
              className="calendar-slot"
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={busy === o.busy_session_id}
              onClick={() => doEnd(o.busy_session_id!)}
            >
              <span>{o.camera_label}</span>
              <span className="calendar-slot-go">{t(lang, 'checkInEnd')}</span>
            </button>
          )
        }
        if (o.busy_session_id && o.already_joined) {
          return (
            <div key={o.camera_row_id} className="calendar-slot calendar-slot--pending">
              <span>{o.camera_label}</span>
              <span>{t(lang, 'checkInAlreadyJoined')}</span>
            </div>
          )
        }
        if (o.busy_session_id && !o.already_joined) {
          const full = o.participant_count >= 10
          return (
            <button
              key={o.camera_row_id}
              className="calendar-slot"
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={full || busy === o.busy_session_id}
              onClick={() => doJoin(o.busy_session_id!)}
            >
              <span>{o.camera_label}</span>
              <span className="calendar-slot-go">
                {full ? t(lang, 'checkInSessionFull') : t(lang, 'checkInJoin', { count: o.participant_count })}
              </span>
            </button>
          )
        }
        return (
          <div key={o.camera_row_id} className="calendar-slot calendar-slot--pending">
            <span>{o.camera_label}</span>
            <span>{t(lang, 'checkInBusy')}</span>
          </div>
        )
      })}
      {error && <p style={{ color: 'var(--error, #c0392b)', fontSize: 12.5 }}>{error}</p>}
      {signOutLink}
    </section>
  )
}
