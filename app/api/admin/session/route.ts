import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from '@/lib/demoAdmin'

// Lets the demo-admin panel skip straight to the date picker on mount if
// the operator is already signed in (the httpOnly cookie from
// api/admin/login), instead of always starting collapsed behind the
// quiet "Admin login" trigger -- the whole point of the 8h cookie is not
// re-entering the password during a demo, which only works if the UI
// actually checks it.
export async function GET() {
  const jar = await cookies()
  const authed = isValidAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)
  return NextResponse.json({ authed })
}
