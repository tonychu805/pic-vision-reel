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

  async function signIn(provider: 'custom:line' | 'google') {
    if (mode === 'signup' && !consentGiven) {
      onBlocked?.()
      return
    }
    if (submitting.current) return
    submitting.current = true
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      // LINE isn't a built-in provider in @supabase/auth-js@2.114.0's
      // `Provider` union (confirmed by reading the installed package's
      // type declarations directly) -- it's wired up as a custom OIDC
      // provider (Supabase Dashboard: Authentication > Providers > New
      // Provider > Manual configuration, identifier `custom:line`,
      // pointed at LINE's authorize/token/userinfo endpoints directly
      // rather than auto-discovery, to route around LINE's web-login ID
      // tokens being HS256-signed while Supabase's OIDC verification only
      // accepts ES256 -- confirmed working end-to-end 2026-09-29). The
      // SDK's `Provider` type has no way to know about a project's custom
      // provider ids, hence the cast.
      provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
      options: {
        // &consent=1 carries the just-ticked checkboxes across the OAuth
        // redirect round-trip: there's no session yet at this point to
        // record consent against (auth.uid() doesn't exist until the
        // callback exchanges the code), so app/auth/callback/route.ts is
        // where it actually gets written, once one does.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${mode === 'signup' ? `&consent=1&training=${trainingConsent ? '1' : '0'}` : ''}`,
        // Confirmed via a captured network trace: the Dashboard's custom-
        // provider "Scopes" field is NOT applied to the outgoing LINE
        // authorize request -- it went out with scope= empty, and LINE's
        // API rejected that with error=INVALID_SCOPE. Scopes must be
        // passed here explicitly, space-separated. No `email` scope: LINE
        // gates that behind a separate approval the channel hasn't
        // requested; "Allow users without email" is on to handle LINE
        // accounts with none.
        ...(provider === 'custom:line' ? { scopes: 'profile openid' } : {}),
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={() => signIn('custom:line')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', border: 'none', borderRadius: 8,
          background: '#06C755', color: '#fff', fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
        }}
      >
        {t(lang, mode === 'signup' ? 'signUpWithLine' : 'signInWithLine')}
      </button>
      <button
        onClick={() => signIn('google')}
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
