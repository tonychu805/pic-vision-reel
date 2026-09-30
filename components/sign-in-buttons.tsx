'use client'

// LINE/Google sign-in, shared by the standalone /login page and anything
// else that needs it. Moved out of app/[slug]/[code]/checkin-panel.tsx so
// there is exactly one place that knows how to start a player OAuth flow.
import { useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { t, type Lang } from '@/lib/i18n'

export default function SignInButtons({
  lang, next, mode = 'login', consentGiven = true, trainingConsent = false, onBlocked,
}: {
  lang: Lang
  next: string
  mode?: 'login' | 'signup'
  // Only meaningful when mode === 'signup': ungated by default so
  // /login's identical buttons (an existing player, already consented at
  // signup) are unaffected. The button always stays clickable regardless
  // (operator request 2026-09-30, no disabled state) -- when consent isn't
  // given yet, a click calls onBlocked() instead of starting the OAuth
  // redirect, letting the parent (components/signup-consent-gate.tsx)
  // shake its checkboxes red rather than the button silently doing
  // nothing.
  consentGiven?: boolean
  // The optional AI-training checkbox's current state, carried across the
  // OAuth round-trip the same way consentGiven is -- there's no session
  // to write it against until app/auth/callback/route.ts.
  trainingConsent?: boolean
  onBlocked?: () => void
}) {
  // Guards against a second tap starting a second signInWithOAuth() call
  // before the browser navigates away from the first -- found 2026-09-30:
  // a real device's LINE attempts consistently showed two "Redirecting to
  // external provider" log entries seconds apart on every failed login,
  // one on the only successful one, each generating its own PKCE
  // code_verifier and clobbering the browser's stored value for the
  // other. The failure then shows up as our own /auth/callback route
  // never even reaching Supabase's /token exchange (no code param), not
  // as a token-exchange error -- consistent with the first flow's
  // eventual redirect losing its matching verifier.
  const submitting = useRef(false)

  // LINE login moved off Supabase's own GoTrue onto Auth0 (2026-09-30,
  // ADR pending) -- GoTrue's custom OIDC provider only ever worked for a
  // LINE identity's first-ever link, then failed every repeat login
  // (matches a known Supabase Auth upstream bug class, never root-caused
  // on our side). Google keeps using signInWithOAuth() below, unaffected.
  function signInWithLine() {
    if (mode === 'signup' && !consentGiven) {
      onBlocked?.()
      return
    }
    if (submitting.current) return
    submitting.current = true
    // btoa(), not Buffer -- this runs in the browser. The payload is
    // always plain ASCII (a path plus two single-digit flags), so the
    // usual btoa() unicode caveat doesn't apply here.
    const stateJson = JSON.stringify({
      next,
      ...(mode === 'signup' ? { consent: '1', training: trainingConsent ? '1' : '0' } : {}),
    })
    const state = btoa(stateJson).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
      response_type: 'code',
      // offline_access is what actually gets a refresh_token back --
      // without it Auth0 only returns an id_token, and a LINE session
      // would die the moment that token's own short expiry hit, same
      // dead end this whole migration exists to fix.
      scope: 'openid profile offline_access',
      connection: 'line',
      redirect_uri: `${window.location.origin}/auth/line-callback`,
      state,
    })
    window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?${params}`
  }

  async function signInWithGoogle() {
    if (mode === 'signup' && !consentGiven) {
      onBlocked?.()
      return
    }
    if (submitting.current) return
    submitting.current = true
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // &consent=1 carries the just-ticked checkboxes across the OAuth
        // redirect round-trip: there's no session yet at this point to
        // record consent against (auth.uid() doesn't exist until the
        // callback exchanges the code), so app/auth/callback/route.ts is
        // where it actually gets written, once one does.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${mode === 'signup' ? `&consent=1&training=${trainingConsent ? '1' : '0'}` : ''}`,
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={signInWithLine}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', border: 'none', borderRadius: 8,
          background: '#06C755', color: '#fff', fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
        }}
      >
        {t(lang, mode === 'signup' ? 'signUpWithLine' : 'signInWithLine')}
      </button>
      <button
        onClick={signInWithGoogle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', border: '1px solid var(--divider)', borderRadius: 8,
          background: '#fff', color: '#1f1f1f', fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
        }}
      >
        {t(lang, mode === 'signup' ? 'signUpWithGoogle' : 'signInWithGoogle')}
      </button>
    </div>
  )
}
