import assert from 'node:assert/strict'
import { test } from 'node:test'
import { needsRefresh, REFRESH_BEFORE_MS, videosEndpoint } from './videoAddresses'

const NOW = Date.parse('2026-09-29T12:00:00Z')

test('addresses are refreshed shortly before they run out', () => {
  const expiresAt = new Date(NOW + REFRESH_BEFORE_MS - 1).toISOString()
  assert.equal(needsRefresh(expiresAt, NOW), true)
})

// Paired: a fresh set is left alone, or every load would call the console.
test('addresses with more than the margin left are not refreshed', () => {
  const expiresAt = new Date(NOW + 60 * 60 * 1000).toISOString()
  assert.equal(needsRefresh(expiresAt, NOW), false)
})

test('an unreadable expiry is treated as expired, never as fresh', () => {
  assert.equal(needsRefresh('not a date', NOW), true)
})

test('the endpoint is the console route for this share', () => {
  assert.match(videosEndpoint('7f64dc23-8d5c-4ba4-a8b2-31e41fb77d85'), /\/api\/share\/7f64dc23-8d5c-4ba4-a8b2-31e41fb77d85\/videos$/)
})
