'use client'

// Demo-admin mode: a quiet date picker for jumping to a candidate demo
// session's reel page, from the QR code's actual landing page -- so one
// physical QR code / bookmarked URL can serve as the whole demo, whatever
// recorded session ends up looking best. Password-gated server-side
// (app/api/admin/login); nothing here trusts the client, this state is
// just UI, not the actual access check. Moved here from the /r/[shareId]
// reel page (operator request, 2026-10-06) -- this page, not that one, is
// what a QR scan actually opens first.
import { useState } from 'react'

type DemoSession = { share_id: string; camera_label: string | null; created_at: string; reel_count: number }

export default function DemoAdminPanel({ slug, code }: { slug: string; code: string }) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [sessions, setSessions] = useState<DemoSession[] | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)

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
                  <a href={`/r/${s.share_id}`}>
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
