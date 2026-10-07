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
import { Fragment, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import { clockLabel } from '@/lib/calendar'
import { checkIn, joinCheckIn, endCheckIn, updateCheckInEnd } from './actions'

export type CheckInOption = {
  camera_row_id: string
  camera_label: string
  is_busy: boolean
  busy_session_id: string | null
  already_joined: boolean
  participant_count: number
  has_current_consent: boolean
  is_owner: boolean
  // null unless is_busy -- see get_check_in_options
  // (pic-vision-cloud-console migrations 20260930180000, 20261004100000).
  // Reflects the real agent_commands row the venue
  // machine reports its own start_recording result onto, not a guess:
  // "pending" means checked in but not yet confirmed by the camera
  // (usually seconds, but the machine could be offline), "done" means
  // it's actually recording, "error" means it tried and failed --
  // recording_error then carries the real reason.
  recording_status: 'pending' | 'done' | 'error' | null
  recording_error: string | null
  // PIC-191 (console migration 20261004100000): busy_session_id now covers
  // every source, not just player check-ins. A 'schedule' (venue) or
  // 'calendar' (booking system) session has no host -- is_owner is always
  // false for it -- so the only thing a player can do is join it.
  session_source: 'player_check_in' | 'schedule' | 'calendar' | null
  session_ends_at: string | null
  // The camera's next booked session, so a new check-in can't run into it
  // (player_check_in refuses with 'booked_soon').
  next_session_starts_at: string | null
  // A non-QR session that ended less than 30 minutes ago: still claimable,
  // because with a pre-booked session nobody necessarily scanned during
  // play. Reported even while the next session is already running.
  recent_session_id: string | null
  recent_starts_at: string | null
  recent_ends_at: string | null
  recent_already_joined: boolean
  recent_participant_count: number
  // A booking-system session's number and booker, so players can spot their
  // own booking (console migration 20261004110000). The name arrives
  // already masked ("A*****y") -- the full name never reaches this page.
  booking_number?: string | null
  booker_masked?: string | null
  recent_booking_number?: string | null
  recent_booker_masked?: string | null
}

/** "A*****y · #149166", or '' when the session didn't come from a booking system. */
function bookingTag(number: string | null | undefined, masked: string | null | undefined): string {
  return [masked, number && `#${number}`].filter(Boolean).join(' · ')
}

// How often to re-check while a check-in's camera hasn't confirmed yet,
// and how long to keep trying before telling the player it's taking a
// while instead of polling forever in silence.
const RECORDING_POLL_MS = 2500
const RECORDING_POLL_MAX_ATTEMPTS = 24 // ~60s

const ERROR_KEYS: Record<string, StringKey> = {
  consent_required: 'consentRequiredError',
  calendar_unavailable: 'calendarUnavailable',
  camera_busy: 'cameraBusyError',
  ends_at_in_past: 'endsAtInPastError',
  ends_at_too_far: 'endsAtTooFarError',
  session_not_active: 'sessionNotActiveError',
  session_full: 'sessionFullError',
  booked_soon: 'bookedSoonError',
}

// A commit action pending the player's explicit confirmation -- check-in,
// join and end all start or stop a real recording, so a mis-tap on the
// wrong court shouldn't be one click away from committing. Keyed so only
// one card shows its confirm state at a time; confirming a different
// card's action replaces it rather than stacking.
type PendingAction = { key: string; message: string; run: () => void }

export default function CheckinPanel({
  lang, slug, code, timeZone, options,
}: {
  lang: Lang
  slug: string
  code: string
  // The venue's timezone, for booked-session times -- the same clock the
  // games calendar below uses, so the two never disagree.
  timeZone: string
  options: CheckInOption[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  // Keyed by camera_row_id -- each court can be booked to a different end
  // time (operator found the shared, single picker wrong: a real group
  // might have one court until 3pm and another until 4pm). No shared
  // state means picking a time for one court never affects another.
  const [endTimes, setEndTimes] = useState<Record<string, { hour: string; period: 'AM' | 'PM' }>>({})

  function endTimeFor(cameraRowId: string) {
    return endTimes[cameraRowId] ?? { hour: '', period: 'PM' as const }
  }
  function setEndHourFor(cameraRowId: string, hour: string) {
    setEndTimes((prev) => ({ ...prev, [cameraRowId]: { ...endTimeFor(cameraRowId), hour } }))
  }
  function setEndPeriodFor(cameraRowId: string, period: 'AM' | 'PM') {
    setEndTimes((prev) => ({ ...prev, [cameraRowId]: { ...endTimeFor(cameraRowId), period } }))
  }

  function showError(code: string) {
    setError(t(lang, ERROR_KEYS[code] ?? 'genericError'))
  }

  // Arms a card's confirm state instead of running the action immediately.
  // Tapping Check in / Join / End always goes through here first.
  function askToConfirm(key: string, message: string, run: () => void) {
    setPending({ key, message, run })
  }
  function confirmPending() {
    const p = pending
    setPending(null)
    p?.run()
  }

  // Polls (via a real server refetch, not a client-only timer) while any
  // check-in on this page is still waiting for its camera to confirm.
  // Stops itself once nothing is pending, and gives up after
  // RECORDING_POLL_MAX_ATTEMPTS so a genuinely stuck camera doesn't poll
  // forever in silence -- pollAttempts is only ever used to decide
  // whether to show "this is taking a while", not to change behavior.
  const anyRecordingPending = options.some((o) => o.recording_status === 'pending')
  const [pollAttempts, setPollAttempts] = useState(0)
  const pollAttemptsRef = useRef(0)
  useEffect(() => {
    if (!anyRecordingPending) { pollAttemptsRef.current = 0; setPollAttempts(0); return }
    if (pollAttemptsRef.current >= RECORDING_POLL_MAX_ATTEMPTS) return
    const id = setTimeout(() => {
      pollAttemptsRef.current += 1
      setPollAttempts(pollAttemptsRef.current)
      router.refresh()
    }, RECORDING_POLL_MS)
    return () => clearTimeout(id)
  }, [anyRecordingPending, options, router])

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
    const { hour, period } = endTimeFor(cameraRowId)
    const endsAtISO = endTimeToISO(hour, period)
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

  // Unlike doEnd, this has to reach the venue machine for real -- the
  // desktop side only takes effect once that release ships, so a player
  // using this today sees the database and console reflect the new time,
  // but the real camera keeps the old stop time until then.
  async function doUpdateEnd(sessionId: string, cameraRowId: string) {
    const { hour, period } = endTimeFor(cameraRowId)
    const endsAtISO = endTimeToISO(hour, period)
    if (!endsAtISO) { setError(t(lang, 'pickEndTimeError')); return }
    setBusy(sessionId)
    setError(null)
    const { error } = await updateCheckInEnd(sessionId, endsAtISO)
    setBusy(null)
    if (error) { showError(error); return }
    router.refresh()
  }

  function recordingStatusLine(o: CheckInOption) {
    if (o.recording_status === 'done') {
      return <p className="checkin-line">✓ {t(lang, 'recordingConfirmed')}</p>
    }
    if (o.recording_status === 'error') {
      return (
        <p className="checkin-line checkin-line--error">
          {t(lang, 'recordingFailed', { error: o.recording_error ?? t(lang, 'genericError') })}
        </p>
      )
    }
    if (o.recording_status === 'pending') {
      return (
        <p className="checkin-line">
          {pollAttempts >= RECORDING_POLL_MAX_ATTEMPTS ? t(lang, 'recordingTakingLonger') : t(lang, 'recordingConfirming')}
        </p>
      )
    }
    return null
  }

  function timePicker(cameraRowId: string, label: string) {
    const { hour, period } = endTimeFor(cameraRowId)
    return (
      <div className="checkin-timepicker">
        <span className="checkin-field-label">{label}</span>
        <div className="checkin-timepicker-row">
          <select
            value={hour} onChange={(e) => setEndHourFor(cameraRowId, e.target.value)}
            className="checkin-select"
          >
            <option value="" disabled>--</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            value={period} onChange={(e) => setEndPeriodFor(cameraRowId, e.target.value as 'AM' | 'PM')}
            className="checkin-select"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    )
  }

  // Swaps a card's action area for a "sure about this?" row once armed by
  // askToConfirm -- same for every commit action, so Check in/Join/End all
  // look and behave identically here.
  function confirmBar(key: string) {
    if (pending?.key !== key) return null
    return (
      <div className="checkin-confirm">
        <p className="checkin-confirm-message">{pending.message}</p>
        <div className="checkin-confirm-actions">
          <button type="button" className="checkin-btn checkin-btn--ghost" onClick={() => setPending(null)}>
            {t(lang, 'confirmCancel')}
          </button>
          <button type="button" className="checkin-btn checkin-btn--primary" onClick={confirmPending}>
            {t(lang, 'confirmYes')}
          </button>
        </div>
      </div>
    )
  }

  function cardHead(label: string, badge: { text: string; tone: 'free' | 'recording' | 'joinable' }) {
    return (
      <div className="checkin-head">
        <span className="checkin-name">{label}</span>
        <span className={`checkin-badge checkin-badge--${badge.tone}`}>{badge.text}</span>
      </div>
    )
  }

  // "Get the reel from 19:00–20:00" for a booked session that just ended.
  function claimRow(o: CheckInOption) {
    if (!o.recent_session_id || !o.recent_starts_at || !o.recent_ends_at) return null
    const times = { start: clockLabel(o.recent_starts_at, timeZone), end: clockLabel(o.recent_ends_at, timeZone) }
    const tag = bookingTag(o.recent_booking_number, o.recent_booker_masked)
    const confirmKey = `claim-${o.recent_session_id}`
    if (o.recent_already_joined) {
      return (
        <div className="checkin-card checkin-card--recording">
          {cardHead(o.camera_label, { text: t(lang, 'checkInBusy'), tone: 'recording' })}
          {tag && <p className="checkin-line">{tag}</p>}
          <p className="checkin-line">{t(lang, 'checkInClaimedRecent', times)}</p>
        </div>
      )
    }
    const full = o.recent_participant_count >= 10
    return (
      <div className="checkin-card checkin-card--joinable">
        {cardHead(o.camera_label, { text: `${o.recent_participant_count}/10`, tone: 'joinable' })}
        {tag && <p className="checkin-line">{tag}</p>}
        <p className="checkin-line">{t(lang, 'checkInClaimRecent', { ...times, count: o.recent_participant_count })}</p>
        {confirmBar(confirmKey) ?? (
          <div className="checkin-actions">
            <button
              type="button"
              className="checkin-btn checkin-btn--primary"
              disabled={full || busy === o.recent_session_id}
              onClick={() => askToConfirm(confirmKey, t(lang, 'confirmJoinMessage', { court: o.camera_label }), () => doJoin(o.recent_session_id!))}
            >
              {full ? t(lang, 'checkInSessionFull') : t(lang, 'checkInJoin', { count: o.recent_participant_count })}
            </button>
          </div>
        )}
      </div>
    )
  }

  function courtRow(o: CheckInOption) {
    const bookedUntil = o.session_source && o.session_source !== 'player_check_in' && o.session_ends_at
      ? [bookingTag(o.booking_number, o.booker_masked), t(lang, 'checkInBookedUntil', { time: clockLabel(o.session_ends_at, timeZone) })]
          .filter(Boolean).join(' · ')
      : null

    if (!o.is_busy) {
      const confirmKey = `checkin-${o.camera_row_id}`
      return (
        <div key={o.camera_row_id} className="checkin-card checkin-card--free">
          {cardHead(o.camera_label, { text: t(lang, 'checkInStatusFree'), tone: 'free' })}
          {o.next_session_starts_at && (
            <p className="checkin-line">{t(lang, 'checkInBookedFrom', { time: clockLabel(o.next_session_starts_at, timeZone) })}</p>
          )}
          {timePicker(o.camera_row_id, t(lang, 'checkInEndTimeLabel'))}
          {confirmBar(confirmKey) ?? (
            <div className="checkin-actions">
              <button
                type="button"
                className="checkin-btn checkin-btn--primary"
                disabled={busy === o.camera_row_id}
                onClick={() => askToConfirm(confirmKey, t(lang, 'confirmCheckInMessage', { court: o.camera_label }), () => doCheckIn(o.camera_row_id))}
              >
                {t(lang, 'checkInStart')}
              </button>
            </div>
          )}
        </div>
      )
    }

    if (o.busy_session_id && o.is_owner) {
      const confirmKey = `end-${o.busy_session_id}`
      return (
        <div key={o.camera_row_id} className="checkin-card checkin-card--recording">
          {cardHead(o.camera_label, { text: t(lang, 'checkInStatusRecording'), tone: 'recording' })}
          {recordingStatusLine(o)}
          {timePicker(o.camera_row_id, t(lang, 'checkInExtendLabel'))}
          <div className="checkin-actions checkin-actions--split">
            <button
              type="button"
              className="checkin-btn checkin-btn--ghost"
              disabled={busy === o.busy_session_id}
              onClick={() => doUpdateEnd(o.busy_session_id!, o.camera_row_id)}
            >
              {t(lang, 'checkInExtendSubmit')}
            </button>
            {pending?.key !== confirmKey && (
              <button
                type="button"
                className="checkin-btn checkin-btn--danger"
                disabled={busy === o.busy_session_id}
                onClick={() => askToConfirm(confirmKey, t(lang, 'confirmEndMessage', { court: o.camera_label }), () => doEnd(o.busy_session_id!))}
              >
                {t(lang, 'checkInEnd')}
              </button>
            )}
          </div>
          {confirmBar(confirmKey)}
        </div>
      )
    }

    if (o.busy_session_id && o.already_joined) {
      return (
        <div key={o.camera_row_id} className="checkin-card checkin-card--recording">
          {cardHead(o.camera_label, { text: t(lang, 'checkInStatusRecording'), tone: 'recording' })}
          <p className="checkin-line">{t(lang, 'checkInAlreadyJoined')}</p>
          {bookedUntil && <p className="checkin-line">{bookedUntil}</p>}
          {recordingStatusLine(o)}
        </div>
      )
    }

    if (o.busy_session_id && !o.already_joined) {
      const full = o.participant_count >= 10
      const confirmKey = `join-${o.busy_session_id}`
      return (
        <div key={o.camera_row_id} className="checkin-card checkin-card--joinable">
          {cardHead(o.camera_label, { text: `${o.participant_count}/10`, tone: 'joinable' })}
          {bookedUntil && <p className="checkin-line">{bookedUntil}</p>}
          {confirmBar(confirmKey) ?? (
            <div className="checkin-actions">
              <button
                type="button"
                className="checkin-btn checkin-btn--primary"
                disabled={full || busy === o.busy_session_id}
                onClick={() => askToConfirm(confirmKey, t(lang, 'confirmJoinMessage', { court: o.camera_label }), () => doJoin(o.busy_session_id!))}
              >
                {full ? t(lang, 'checkInSessionFull') : t(lang, 'checkInJoin', { count: o.participant_count })}
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={o.camera_row_id} className="checkin-card checkin-card--recording">
        {cardHead(o.camera_label, { text: t(lang, 'checkInStatusRecording'), tone: 'recording' })}
      </div>
    )
  }

  const anyFree = options.some((o) => !o.is_busy)
  // Natural/numeric sort ("Court 2" before "Court 10"), not the raw order
  // get_check_in_options happens to return -- that order isn't meaningful
  // to a player picking a court.
  const sortedOptions = [...options].sort((a, b) => a.camera_label.localeCompare(b.camera_label, undefined, { numeric: true }))
  return (
    <section className="calendar-court">
      <h2>{t(lang, 'checkInTitle')}</h2>
      {options.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t(lang, 'checkInNoCameras')}</p>
      ) : !anyFree && (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t(lang, 'checkInNoneFree')}</p>
      )}
      <div className="checkin-grid">
        {sortedOptions.map((o) => (
          <Fragment key={o.camera_row_id}>
            {claimRow(o)}
            {courtRow(o)}
          </Fragment>
        ))}
      </div>
      {error && <p style={{ color: 'var(--error, #c0392b)', fontSize: 12.5 }}>{error}</p>}
    </section>
  )
}
