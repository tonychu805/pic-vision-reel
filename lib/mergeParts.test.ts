import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeParts, MAX_RALLIES } from './mergeParts'

type R = { id: string; kind: string; rally_rank: number | null; part_index: number | null }
const rally = (part: number, rank: number): R => ({ id: `p${part}r${rank}`, kind: 'rally', rally_rank: rank, part_index: part })
const other = (part: number | null, kind: string): R => ({ id: `p${part}${kind}`, kind, rally_rank: null, part_index: part })

test('a share from before parts, or a single part, is shown exactly as today', () => {
  const old = [rally(0, 1), other(null, 'burst'), other(null, 'full')].map((r) => ({ ...r, part_index: null }))
  assert.deepEqual(mergeParts(old), old)
  const one = [rally(1, 1), rally(1, 2), other(1, 'burst'), other(1, 'full')]
  assert.deepEqual(mergeParts(one), one)
})

test('several parts: best of each part first, renumbered, then the newest part\'s quick hits and full reel', () => {
  const reels = [
    rally(1, 1), rally(1, 2), other(1, 'burst'), other(1, 'full'),
    rally(2, 1), rally(2, 2), other(2, 'burst'), other(2, 'full'),
    rally(3, 1), other(3, 'burst'), other(3, 'full'),
  ]
  const out = mergeParts(reels)
  assert.deepEqual(out.map((r) => r.id), ['p1r1', 'p2r1', 'p3r1', 'p1r2', 'p2r2', 'p3burst', 'p3full'])
  assert.deepEqual(out.filter((r) => r.kind === 'rally').map((r) => r.rally_rank), [1, 2, 3, 4, 5])
})

test('never more rally clips than a normal page has, however many parts', () => {
  const reels = [1, 2, 3, 4, 5, 6].flatMap((p) => [...Array.from({ length: 10 }, (_, i) => rally(p, i + 1)), other(p, 'burst'), other(p, 'full')])
  const out = mergeParts(reels)
  assert.equal(out.filter((r) => r.kind === 'rally').length, MAX_RALLIES)
  assert.equal(out.length, MAX_RALLIES + 2)
  assert.deepEqual(out.slice(0, 6).map((r) => r.id), ['p1r1', 'p2r1', 'p3r1', 'p4r1', 'p5r1', 'p6r1'])
})

test('a newest part still processing its quick hits simply has none yet', () => {
  const out = mergeParts([rally(1, 1), other(1, 'burst'), rally(2, 1)])
  assert.deepEqual(out.map((r) => r.id), ['p1r1', 'p2r1'])
})
