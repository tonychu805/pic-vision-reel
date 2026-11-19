import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isVenueSlug, venueSlugFromNext } from './venueSlug'

test('a venue check-in path yields its slug, with or without a tail', () => {
  assert.equal(venueSlugFromNext('/court-club/abcd1234'), 'court-club')
  assert.equal(venueSlugFromNext('/court-club/abcd1234/'), 'court-club')
  assert.equal(venueSlugFromNext('/dope/abcd1234efgh?tab=reels#x'), 'dope')
})

test('anything that is not a plain venue path yields null', () => {
  for (const bad of ['/', '', '/account', '/login', '/court-club', '/court-club/short', '//evil.com/abcd1234', 'https://x.com/court-club/abcd1234',
    '/-bad/abcd1234', '/a/abcd1234', `/${'a'.repeat(33)}/abcd1234`, '/court club/abcd1234', '/club/abcd1234$x', '/club/../abcd1234', null, undefined, 42, {}]) {
    assert.equal(venueSlugFromNext(bad), null, String(bad))
  }
})

test('isVenueSlug accepts only a bare venue slug', () => {
  for (const ok of ['court-club', 'dope', 'a1', 'a'.repeat(32)]) assert.equal(isVenueSlug(ok), true, ok)
  for (const bad of ['', 'a', '-bad', 'a'.repeat(33), 'court/club', 'club\n', '/club', 'a b', null, undefined, 42, {}]) {
    assert.equal(isVenueSlug(bad), false, String(bad))
  }
})
