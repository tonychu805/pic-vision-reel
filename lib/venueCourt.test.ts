import { test } from 'node:test'
import assert from 'node:assert/strict'
import { courtFromParam } from './venueCourt'

test('a court QR code names one camera', () => {
  assert.equal(courtFromParam('3F2A1B4C-0000-4000-8000-00000000000A'), '3f2a1b4c-0000-4000-8000-00000000000a')
  assert.equal(courtFromParam(['3f2a1b4c-0000-4000-8000-00000000000a', 'x']), '3f2a1b4c-0000-4000-8000-00000000000a')
})

test('anything else is the all-courts page', () => {
  for (const v of [undefined, '', 'court-2', '3f2a1b4c', "1' or '1'='1"]) assert.equal(courtFromParam(v), null)
})
