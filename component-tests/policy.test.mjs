import assert from 'node:assert/strict'
import { test } from 'node:test'

test('CSP permits refreshing videos from the configured console origin', async () => {
  const original = process.env.NEXT_PUBLIC_CONSOLE_URL
  try {
    for (const [suffix, url, origin] of [
      ['default', undefined, 'https://console.picvisionai.com'],
      ['custom', 'https://staging.example.com/some-path/', 'https://staging.example.com'],
    ]) {
      if (url) process.env.NEXT_PUBLIC_CONSOLE_URL = url
      else delete process.env.NEXT_PUBLIC_CONSOLE_URL
      const { default: config } = await import(`../next.config.mjs?policy-test=${suffix}`)
      const csp = (await config.headers())[0].headers.find((h) => h.key === 'Content-Security-Policy').value
      const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src')).trim().split(/\s+/)
      assert.ok(connect.includes(origin))
      assert.ok(connect.includes("'self'"))
      assert.ok(connect.includes('https://cdn.picvisionai.com'))
      assert.ok(!connect.includes('*'))
    }
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CONSOLE_URL
    else process.env.NEXT_PUBLIC_CONSOLE_URL = original
  }
})

// Email sign-in/sign-up runs Supabase Auth from the browser
// (components/email-auth-form.tsx). Without the project origin in
// connect-src every email sign-in failed with "Failed to fetch" (2026-10-29).
test('CSP lets the browser reach the configured Supabase project for email sign-in', async () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    for (const [suffix, url, origin] of [
      ['prod-default', undefined, 'https://evceszapbiuwdmqfisqx.supabase.co'],
      ['staging', 'https://qwoiqgkqsznbzvigousg.supabase.co', 'https://qwoiqgkqsznbzvigousg.supabase.co'],
    ]) {
      if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url
      else delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const { default: config } = await import(`../next.config.mjs?supabase-test=${suffix}`)
      const csp = (await config.headers())[0].headers.find((h) => h.key === 'Content-Security-Policy').value
      const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src')).trim().split(/\s+/)
      assert.ok(connect.includes(origin), `${origin} missing from ${connect.join(' ')}`)
    }
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original
  }
})
