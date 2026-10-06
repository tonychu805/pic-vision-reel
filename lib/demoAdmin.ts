// Gates the share page's demo-admin mode (app/r/[shareId]/reel-share-client.tsx):
// a hidden "Admin login" link lets the operator unlock a date picker to
// jump between candidate demo sessions from one bookmarked share link,
// without needing a different URL per candidate clip. Not a real user
// account system -- one shared password (DEMO_ADMIN_PASSWORD), checked
// server-side only, never shipped to the client. The signed cookie exists
// so the password isn't re-entered on every request during a demo, not to
// model "who" is logged in.
import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE_NAME = 'demo_admin'
const TTL_MS = 8 * 60 * 60 * 1000 // 8h -- covers a full demo day, not meant to persist beyond it

function secret(): string {
  const v = process.env.DEMO_ADMIN_PASSWORD
  if (!v) throw new Error('DEMO_ADMIN_PASSWORD is not set')
  return v
}

function sign(expiresAt: number): string {
  return createHmac('sha256', secret()).update(String(expiresAt)).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function makeAdminCookieValue(): string {
  const expiresAt = Date.now() + TTL_MS
  return `${expiresAt}.${sign(expiresAt)}`
}

export function isValidAdminCookie(value: string | undefined): boolean {
  if (!value) return false
  const dot = value.indexOf('.')
  if (dot < 0) return false
  const expiresAt = Number(value.slice(0, dot))
  const mac = value.slice(dot + 1)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false
  try {
    return safeEqualHex(mac, sign(expiresAt))
  } catch {
    return false
  }
}

export function checkPassword(candidate: string): boolean {
  let real: string
  try {
    real = secret()
  } catch {
    return false
  }
  const bufA = Buffer.from(candidate)
  const bufB = Buffer.from(real)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
