import assert from 'node:assert/strict'
import { test } from 'node:test'
import { promoPrompt, promoTickedInMetadata } from './promoPrompt'

test('a game nobody answered asks, unless the account setting already agrees', () => {
  assert.deepEqual(promoPrompt(false, undefined), { kind: 'ask' })
  assert.deepEqual(promoPrompt(false, null), { kind: 'ask' })
  assert.deepEqual(promoPrompt(true, undefined), { kind: 'covered-by-account' })
})

test('an answered game is asked about once, whichever way it was answered', () => {
  assert.deepEqual(promoPrompt(false, true), { kind: 'answered', allowed: true })
  assert.deepEqual(promoPrompt(false, false), { kind: 'answered', allowed: false })
})

test('the account setting wins over an earlier "not this one", as the database counts it', () => {
  assert.deepEqual(promoPrompt(true, false), { kind: 'covered-by-account' })
})

test('only a signup box ticked for the current version counts from user_metadata', () => {
  assert.equal(promoTickedInMetadata({ promo_consent_version: '2026-11-16' }, '2026-11-16'), true)
  assert.equal(promoTickedInMetadata({ promo_consent_version: '2026-09-30' }, '2026-11-16'), false)
  assert.equal(promoTickedInMetadata({ consent_version: '2026-11-16' }, '2026-11-16'), false)
  assert.equal(promoTickedInMetadata(null, '2026-11-16'), false)
})
