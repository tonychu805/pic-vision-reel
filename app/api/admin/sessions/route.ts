import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from '@/lib/demoAdmin'
import { supabasePublic } from '@/lib/supabase'

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

  // Anon key, same as the page's own data fetch -- get_demo_sessions_by_slug_code
  // (pic-vision-cloud-console migration 20261006110000) is itself the
  // narrow, anon-safe read; this route's only job is the password gate above.
  const supabase = supabasePublic()
  const { data, error } = await supabase.rpc('get_demo_sessions_by_slug_code', {
    p_slug: slug,
    p_code: code,
    p_date: date,
  })
  if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}
