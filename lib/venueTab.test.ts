import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tabFromParam, tabParam } from './venueTab'

test('every tab round-trips through ?tab=, and check-in needs no parameter', () => {
  for (const tab of ['checkin', 'sessions', 'account'] as const) {
    assert.equal(tabFromParam(tabParam(tab) ?? undefined), tab)
  }
  assert.equal(tabParam('checkin'), null)
  assert.equal(tabParam('sessions'), 'highlights')
})

test('anything unexpected in ?tab= opens check-in', () => {
  for (const v of [undefined, '', 'sessions', 'HIGHLIGHTS', '<script>', ['account', 'x']]) {
    const expected = Array.isArray(v) && v[0] === 'account' ? 'account' : 'checkin'
    assert.equal(tabFromParam(v as string | string[] | undefined), expected)
  }
})
