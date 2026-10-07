'use client'

// Demo-admin mode: a quiet date picker for jumping to a candidate demo
// session's reel page, from the QR code's actual landing page -- so one
// physical QR code / bookmarked URL can serve as the whole demo, whatever
// recorded session ends up looking best. Password-gated server-side
// (app/api/admin/login); nothing here trusts the client, this state is
// just UI, not the actual access check. Moved here from the /r/[shareId]
// reel page (operator request, 2026-10-06) -- this page, not that one, is
// what a QR scan actually opens first.
import { useEffect, useState } from 'react'

type DemoSession = { share_id: string; camera_label: string | null; created_at: string; reel_count: number }

// Sessions with a manually-uploaded vertical/TikTok-style alternative (R2
// <brand_id>/vertical-test/<shareId>/manifest.json) -- link straight to it
// from the picker instead of the normal reel page, since the point of the
// picker is choosing the best thing to show live.
const VERTICAL_TEST_SHARE_IDS = new Set([
  'aa425ca1-5833-41ba-ac29-a0a96c977af7',
  '7f64dc23-8d5c-4ba4-a8b2-31e41fb77d85',
  '1cd028a3-f171-49dd-b0c6-635e87577c27',
  '230e2f5e-8811-4f65-8452-da938a721010',
  '596d42d4-15b5-4a2c-b558-923d78b2efd6',
])

export default function DemoAdminPanel({ slug, code }: { slug: string; code: string }) {
  const [checkingSession, setCheckingSession] = useState(true)
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [sessions, setSessions] = useState<DemoSession[] | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Already-signed-in-this-demo-day check: the login cookie lasts 8h
  // specifically so it survives page loads/tab switches, but that's
  // useless if the UI still starts collapsed behind "Admin login" and
  // asks for the password again. Skip straight to the date picker when
  // the cookie's still good.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session')
      .then((res) => (res.ok ? res.json() : { authed: false }))
      .then((data: { authed?: boolean }) => {
        if (cancelled) return
        if (data.authed) {
          setAuthed(true)
          setOpen(true)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingSession(false) })
    return () => { cancelled = true }
  }, [])

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setAuthed(true)
        setPassword('')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
    setBusy(false)
  }

  async function loadSessions(d: string) {
    setDate(d)
    if (!d) {
      setSessions(null)
      return
    }
    setSessionsLoading(true)
    try {
      const res = await fetch(`/api/admin/sessions?slug=${encodeURIComponent(slug)}&code=${encodeURIComponent(code)}&date=${d}`)
      setSessions(res.ok ? ((await res.json()).sessions ?? []) : [])
    } catch {
      setSessions([])
    }
    setSessionsLoading(false)
  }

  if (checkingSession) return <div className="demo-admin" />

  return (
    <div className="demo-admin">
      {!open ? (
        <button type="button" className="demo-admin-trigger" onClick={() => setOpen(true)}>
          Admin login
        </button>
      ) : !authed ? (
        <form className="demo-admin-form" onSubmit={submitPassword}>
          <input
            type="password"
            className="demo-admin-input"
            placeholder="Password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
          />
          <button type="submit" className="demo-admin-trigger" disabled={busy || !password}>
            {busy ? '…' : 'Go'}
          </button>
          {error && <span className="demo-admin-error">Wrong password</span>}
        </form>
      ) : (
        <div className="demo-admin-picker">
          <input
            type="date"
            className="demo-admin-input"
            value={date}
            onChange={(e) => loadSessions(e.target.value)}
          />
          {sessionsLoading && <span className="demo-admin-error">Loading…</span>}
          {sessions && sessions.length === 0 && !sessionsLoading && (
            <span className="demo-admin-error">No sessions that day</span>
          )}
          {sessions && sessions.length > 0 && (
            <ul className="demo-admin-list">
              {sessions.map((s) => (
                <li key={s.share_id}>
                  <a
                    href={`/r/${s.share_id}${VERTICAL_TEST_SHARE_IDS.has(s.share_id) ? '/test' : ''}`}
                    style={VERTICAL_TEST_SHARE_IDS.has(s.share_id) ? { textDecoration: 'underline' } : undefined}
                  >
                    {s.camera_label ?? 'Camera'} · {new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {s.reel_count} clips
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
