import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FLAG_TTL_MS, isFlagOn, resetFlagCache } from './featureFlags'

const answer = (flags: Record<string, boolean>) => async () =>
  new Response(JSON.stringify({ flags: Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, { key: k, enabled: v }])) }))

test('a flag is on only when PostHog says enabled; absent or off is off', async () => {
  resetFlagCache()
  const fetch = answer({ 'share-sound-button': true, other: false }) as unknown as typeof globalThis.fetch
  assert.equal(await isFlagOn('share-sound-button', { fetch }), true)
  assert.equal(await isFlagOn('other', { fetch }), false)
  assert.equal(await isFlagOn('never-created', { fetch }), false)
})

test('fails closed with no answer, and keeps the last good answer through an outage', async () => {
  resetFlagCache()
  const down = (async () => { throw new TypeError('offline') }) as unknown as typeof globalThis.fetch
  assert.equal(await isFlagOn('share-sound-button', { fetch: down }), false)
  let t = 0
  const now = () => t
  await isFlagOn('share-sound-button', { fetch: answer({ 'share-sound-button': true }) as unknown as typeof globalThis.fetch, now })
  t += FLAG_TTL_MS
  assert.equal(await isFlagOn('share-sound-button', { fetch: down, now }), true)
})

test('asks PostHog at most once a minute, with no player data', async () => {
  resetFlagCache()
  const calls: { body: string }[] = []
  const fetch = (async (_url: string, init: RequestInit) => { calls.push({ body: String(init.body) }); return answer({ x: true })() }) as unknown as typeof globalThis.fetch
  let t = 0
  const now = () => t
  await isFlagOn('x', { fetch, now }); await isFlagOn('x', { fetch, now })
  assert.equal(calls.length, 1)
  t += FLAG_TTL_MS
  await isFlagOn('x', { fetch, now })
  assert.equal(calls.length, 2)
  assert.deepEqual(Object.keys(JSON.parse(calls[0].body)).sort(), ['api_key', 'distinct_id'])
  assert.equal(JSON.parse(calls[0].body).distinct_id, 'share-site-server')
})
