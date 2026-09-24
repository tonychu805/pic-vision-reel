import assert from 'node:assert/strict'
import { test } from 'node:test'
import { byCourt, slotLabel } from './calendar'

test('games grouped by court in natural order, newest first', () => {
  const g = (court: string, started_at: string) => ({ court, started_at, ends_at: null, share_id: null })
  const out = byCourt([g('Court 10', '2026-09-26T02:00:00Z'), g('Court 2', '2026-09-26T01:00:00Z'), g('Court 2', '2026-09-26T03:00:00Z')])
  assert.deepEqual(out.map((c) => c.court), ['Court 2', 'Court 10'])
  assert.deepEqual(out[0].games.map((x) => x.started_at), ['2026-09-26T03:00:00Z', '2026-09-26T01:00:00Z'])
})

test('slots in venue time', () => {
  const game = { court: 'C', started_at: '2026-09-26T06:00:00Z', ends_at: '2026-09-26T07:00:00Z', share_id: null }
  assert.equal(slotLabel(game, 'Asia/Taipei'), '14:00–15:00')
  assert.equal(slotLabel({ ...game, ends_at: null }, 'Asia/Taipei'), '14:00')
})
