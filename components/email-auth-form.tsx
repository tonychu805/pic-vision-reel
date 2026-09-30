'use client'

// Email/password sign-in and sign-up, shared by /login and /signup (mode
// picks which). Supabase Auth's email/password provider is already
// enabled project-wide -- pic-vision-cloud-console's app/sign-in/page.tsx
// already uses signInWithPassword/signUp against this same project, so no
// new Dashboard config is needed here.
//
// Sign-up is two steps (operator request 2026-09-29: email-only first,
// name/password only after): step 'email' collects just the address and
// the Create-account button click ADVANCES the step rather than calling
// Supabase; step 'details' then shows name+password (email now read-only,
// already committed) and its own submit actually calls signUp(). Sign-in
// has no such split -- a returning user already has both, asked for
// together same as before.
//
// Consent lives one level up, in components/signup-consent-gate.tsx: one
// checkbox pair at the top of /signup gates every signup method (LINE,
// Google, email) at once, rather than each method asking separately.
// consentGiven is that gate's current state, passed down.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { t, type Lang } from '@/lib/i18n'
import { ensurePlayerAfterEmailAuth } from '@/app/login/actions'
import { recordConsent } from '@/app/[slug]/[code]/actions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputStyle = { padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 8, background: 'transparent', color: 'var(--text)', fontSize: 14 }

export default function EmailAuthForm({
  lang, mode, next, consentGiven = true, onBlocked,
}: {
  lang: Lang
  mode: 'login' | 'signup'
  next: string
  // Only meaningful when mode === 'signup' -- ungated by default so
  // /login's identical form (an existing player, already consented at
  // signup) is unaffected. The submit button always stays clickable
  // (operator request 2026-09-30, no disabled state for consent); when
  // consent isn't given yet, submitting at the details step calls
  // onBlocked() instead of signing up, so the parent
  // (components/signup-consent-gate.tsx) can shake its checkboxes red.
  consentGiven?: boolean
  onBlocked?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'details'>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const atDetailsStep = mode === 'login' || step === 'details'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && step === 'email') {
      if (!EMAIL_RE.test(email)) { setError(t(lang, 'invalidEmail')); return }
      setStep('details')
      return
    }

    // Only the actual signUp() submit (details step) needs the gate --
    // sign-in has nothing to gate. A pre-2026-09-30 email account that
    // never went through /signup's gate falls through to /consent's own
    // page-level gate on app/[slug]/[code]/page.tsx as a fallback.
    if (mode === 'signup' && step === 'details' && !consentGiven) {
      onBlocked?.()
      return
    }

    setBusy(true)
    const supabase = createClient()

    const { data, error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() || undefined } } })
        : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setBusy(false)
      setError(authError.message)
      return
    }

    if (!data.session) {
      // Email confirmation is on for this project (same setting
      // pic-vision-cloud-console's sign-up already relies on) -- signUp
      // succeeds but returns no session until the link is clicked, so
      // there's no auth.uid() yet to record consent against. Recorded
      // instead the first time they actually get a session (after
      // confirming and logging in), via /consent's fallback gate.
      setBusy(false)
      setCheckEmail(true)
      return
    }

    if (mode === 'signup') {
      const { error: consentError } = await recordConsent(true, true)
      if (consentError) {
        setBusy(false)
        setError(consentError)
        return
      }
    }

    await ensurePlayerAfterEmailAuth()
    router.push(next)
    router.refresh()
  }

  if (checkEmail) {
    return <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{t(lang, 'checkYourEmail')}</p>
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t(lang, 'emailLabel')}
        readOnly={mode === 'signup' && step === 'details'}
        style={{ ...inputStyle, opacity: mode === 'signup' && step === 'details' ? 0.6 : 1 }}
      />
      {atDetailsStep && mode === 'signup' && (
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t(lang, 'nameLabel')}
          style={inputStyle}
        />
      )}
      {atDetailsStep && (
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t(lang, 'passwordLabel')}
          style={inputStyle}
        />
      )}
      <button
        type="submit" disabled={busy} className="calendar-slot"
        style={{ justifyContent: 'center' }}
      >
        {mode === 'signup'
          ? t(lang, step === 'email' ? 'signUpSubmit' : 'completeSignUp')
          : t(lang, 'signInSubmit')}
      </button>
      {error && <p style={{ color: 'var(--error, #c0392b)', fontSize: 12.5 }}>{error}</p>}
    </form>
  )
}
