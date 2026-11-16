import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from '@/lib/demoAdmin'
import { supabaseServerOnly } from '@/lib/supabaseServerOnly'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,31}$/i
const CODE_RE = /^[a-z0-9]{8,64}$/i

// Anchored by slug+code, not a share_id -- this is the calendar/check-in
// page's lookup (app/[slug]/[code]), which is what the QR code actually
// lands on and the only thing that page has to anchor with.
export async function GET(request: Request) {
  const jar = await cookies()
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: 'not authorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') ?? ''
  const code = url.searchParams.get('code') ?? ''
  const date = url.searchParams.get('date') ?? ''
  if (!SLUG_RE.test(slug) || !CODE_RE.test(code) || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'slug, code, and date (YYYY-MM-DD) are required' }, { status: 400 })
  }

  // Service role, after the password gate above: get_demo_sessions_by_slug_code
  // lists every game at a venue, so it is not callable with the public anon
  // key (console migration 20261116180000; it was, and anyone with a venue's
  // poster address could list all its games -- 2026-11-16 security review).
  const supabase = supabaseServerOnly()
  const { data, error } = await supabase.rpc('get_demo_sessions_by_slug_code', {
    p_slug: slug,
    p_code: code,
    p_date: date,
  })
  if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}
