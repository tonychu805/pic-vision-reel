import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, checkPassword, makeAdminCookieValue } from '@/lib/demoAdmin'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: unknown }
  if (typeof body.password !== 'string' || !checkPassword(body.password)) {
    // Same response shape either way (bad JSON, missing field, wrong
    // password) -- nothing here should tell an attacker which part failed.
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const jar = await cookies()
  jar.set(ADMIN_COOKIE_NAME, makeAdminCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return NextResponse.json({ ok: true })
}
