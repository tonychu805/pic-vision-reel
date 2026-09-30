// Code-exchange landing spot for LINE login via Auth0 (Google/email stay
// on app/auth/callback/route.ts, unchanged, via Supabase's own GoTrue).
// Auth0 tokens never touch the browser except as httpOnly cookies set
// here -- the code exchange itself (which needs AUTH0_CLIENT_SECRET) only
// ever runs server-side, same handling as the existing GoTrue callback.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { AUTH0_ID_TOKEN_COOKIE, AUTH0_REFRESH_TOKEN_COOKIE, exchangeAuth0Token, decodeAuth0IdToken } from '@/lib/auth0'

function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

// Same reverse-proxy caveat as app/auth/callback/route.ts: request.url's
// origin isn't trustworthy behind Tailscale's proxy, so prefer what the
// proxy says the client-facing address actually was.
function trustedOrigin(request: Request, fallback: string): string {
  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('x-forwarded-host')
  return proto && host ? `${proto}://${host}` : fallback
}

type LineState = { next?: string; consent?: string; training?: string }

function decodeState(raw: string | null): LineState {
  if (!raw) return {}
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = trustedOrigin(request, url.origin)
  const code = url.searchParams.get('code')
  const state = decodeState(url.searchParams.get('state'))
  const next = state.next && state.next.startsWith('/') && !state.next.startsWith('//') ? state.next : '/'
  const failure = NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&auth_error=1`)

  if (!code) return failure

  const tokens = await exchangeAuth0Token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${origin}/auth/line-callback`,
  })
  if (!tokens) return failure

  const { sub, name } = decodeAuth0IdToken(tokens.id_token)

  // A one-off client carrying the fresh Auth0 id token as its accessToken
  // -- current_player_id() (pic-vision-cloud-console migration
  // 20260930130000) resolves it via the "line|..." sub, same as any other
  // request from this player from here on.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => tokens.id_token },
  )

  const { error: ensureError } = await supabase.rpc('ensure_line_player', {
    p_auth0_sub: sub,
    p_display_name: name?.trim() || null,
  })
  if (ensureError) return failure

  // Mirrors app/auth/callback/route.ts's consent/training handling: these
  // query params are only ever set by components/sign-in-buttons.tsx's
  // signup path, carrying the just-ticked checkboxes across the redirect
  // round-trip since there's no player row to record them against before
  // this point.
  if (state.consent === '1') {
    const h = await headers()
    await supabase.rpc('record_player_consent', {
      p_filming_consent: true,
      p_retention_policy_accepted: true,
      p_ip_address: clientIp(h),
      p_user_agent: h.get('user-agent'),
    })
  }
  if (state.training !== undefined) {
    await supabase.rpc('set_training_consent', { p_consented: state.training === '1' })
  }

  const response = NextResponse.redirect(`${origin}${next}`)
  response.cookies.set(AUTH0_ID_TOKEN_COOKIE, tokens.id_token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: tokens.expires_in,
  })
  if (tokens.refresh_token) {
    // Auth0's refresh token itself has no fixed lifetime by default (only
    // rotates/invalidates on use) -- 30 days here is just this cookie's
    // own ceiling, same order of magnitude as a typical "stay signed in".
    response.cookies.set(AUTH0_REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}
