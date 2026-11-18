import assert from 'node:assert/strict'
import { test } from 'node:test'
import { promoPrompt, promoTickedInMetadata, venueConsented, venueHasChoice, type PromoVenue } from './promoPrompt'

const venues: PromoVenue[] = [
  { brand_name: 'Pickle Club', slug: 'pickle-club', consented: true },
  { brand_name: 'Dink House', slug: 'dink-house', consented: false },
  { brand_name: 'New Courts', slug: 'new-courts', consented: null },
]

test('a game nobody answered asks, unless this venue already agrees', () => {
  assert.deepEqual(promoPrompt(false, undefined), { kind: 'ask' })
  assert.deepEqual(promoPrompt(false, null), { kind: 'ask' })
  assert.deepEqual(promoPrompt(true, undefined), { kind: 'covered-by-venue' })
})

test('an answered game is asked about once, whichever way it was answered', () => {
  assert.deepEqual(promoPrompt(false, true), { kind: 'answered', allowed: true })
  assert.deepEqual(promoPrompt(false, false), { kind: 'answered', allowed: false })
})

test('the venue setting wins over an earlier "not this one", as the database counts it', () => {
  assert.deepEqual(promoPrompt(true, false), { kind: 'covered-by-venue' })
})

test('consent is read per venue: only this venue\'s own yes counts', () => {
  assert.equal(venueConsented(venues, 'pickle-club'), true)
  assert.equal(venueConsented(venues, 'dink-house'), false)
  assert.equal(venueConsented(venues, 'new-courts'), false) // never set
  assert.equal(venueConsented(venues, 'elsewhere'), false) // not in the list
  assert.equal(venueConsented([], 'pickle-club'), false)
})

test('a yes or a no is a choice; never set and unlisted are not', () => {
  assert.equal(venueHasChoice(venues, 'pickle-club'), true)
  assert.equal(venueHasChoice(venues, 'dink-house'), true)
  assert.equal(venueHasChoice(venues, 'new-courts'), false)
  assert.equal(venueHasChoice(venues, 'elsewhere'), false)
})

test('only a signup box ticked for the current version counts from user_metadata', () => {
  assert.equal(promoTickedInMetadata({ promo_consent_version: '2026-11-16' }, '2026-11-16'), true)
  assert.equal(promoTickedInMetadata({ promo_consent_version: '2026-09-30' }, '2026-11-16'), false)
  assert.equal(promoTickedInMetadata({ consent_version: '2026-11-16' }, '2026-11-16'), false)
  assert.equal(promoTickedInMetadata(null, '2026-11-16'), false)
})
