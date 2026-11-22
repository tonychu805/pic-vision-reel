import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playTime } from './playTime'

test('Taipei wall-clock time, 24-hour', () => {
  assert.equal(playTime('2026-11-21T12:03:19.700Z'), '20:03')
  assert.equal(playTime('2026-11-22T02:46:54Z'), '10:46')
})

test('a rally just after Taipei midnight reads 00:xx, not 24:xx', () => {
  assert.equal(playTime('2026-11-21T16:00:30Z'), '00:00')
})

test('no time or a bad one shows nothing', () => {
  assert.equal(playTime(null), null)
  assert.equal(playTime(undefined), null)
  assert.equal(playTime('not a date'), null)
})
