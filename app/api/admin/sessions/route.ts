import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from '@/lib/demoAdmin'
import { supabasePublic } from '@/lib/supabase'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const jar = await cookies()
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: 'not authorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const shareId = url.searchParams.get('shareId') ?? ''
  const date = url.searchParams.get('date') ?? ''
  if (!UUID_RE.test(shareId) || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'shareId and date (YYYY-MM-DD) are required' }, { status: 400 })
  }

  // Anon key, same as the page's own data fetch -- get_demo_sessions_by_share_id
  // (pic-vision-cloud-console migration 20261006100000) is itself the
  // narrow, anon-safe read; this route's only job is the password gate above.
  const supabase = supabasePublic()
  const { data, error } = await supabase.rpc('get_demo_sessions_by_share_id', {
    p_share_id: shareId,
    p_date: date,
  })
  if (error) return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}
