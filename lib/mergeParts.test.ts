import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeParts, MAX_RALLIES } from './mergeParts'

type R = { id: string; kind: string; rally_rank: number | null; part_index: number | null; score?: number | string | null; badge?: string | null }
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

const scoredRally = (part: number, rank: number, score: number | string | null) => ({ ...rally(part, rank), score })

test('with scores on every rally clip, the top 10 is by score across parts, not by part', () => {
  const reels = [
    scoredRally(1, 1, 55), scoredRally(1, 2, 50), other(1, 'burst'), other(1, 'full'),
    scoredRally(2, 1, 80), scoredRally(2, 2, 78), scoredRally(2, 3, 60), other(2, 'burst'), other(2, 'full'),
  ]
  const out = mergeParts(reels)
  // part 2's #2 (78) beats part 1's #1 (55): the old interleave would have put p1r1 second.
  assert.deepEqual(out.map((r) => r.id), ['p2r1', 'p2r2', 'p2r3', 'p1r1', 'p1r2', 'p2burst', 'p2full'])
  assert.deepEqual(out.filter((r) => r.kind === 'rally').map((r) => r.rally_rank), [1, 2, 3, 4, 5])
})

test('scores arriving as strings (Postgres numeric) sort as numbers', () => {
  const out = mergeParts([scoredRally(1, 1, '9.5'), scoredRally(2, 1, '10.2')])
  assert.deepEqual(out.map((r) => r.id), ['p2r1', 'p1r1'])
})

test('a session with any unscored rally clip (made before scores) keeps the old interleave', () => {
  const out = mergeParts([scoredRally(1, 1, 10), scoredRally(1, 2, 5), scoredRally(2, 1, null)])
  assert.deepEqual(out.map((r) => r.id), ['p1r1', 'p2r1', 'p1r2'])
})

const badgedRally = (part: number, rank: number, score: number, badge: string | null) => ({ ...rally(part, rank), score, badge })

test('badged clips come first, then the best of the rest, up to a normal page', () => {
  // Pods with badges on send every rally: 12 here in one part.
  const reels = [
    ...Array.from({ length: 12 }, (_, i) => badgedRally(1, i + 1, 90 - i, i === 11 ? 'Kitchen War' : i === 4 ? 'Killer Shot' : null)),
    other(1, 'burst'), other(1, 'full'),
  ]
  const out = mergeParts(reels)
  assert.deepEqual(out.slice(0, 2).map((r) => r.badge), ['Killer Shot', 'Kitchen War'], 'badged first, by score')
  assert.equal(out.filter((r) => r.kind === 'rally').length, MAX_RALLIES)
  assert.deepEqual(out.slice(2, 10).map((r) => r.id), ['p1r1', 'p1r2', 'p1r3', 'p1r4', 'p1r6', 'p1r7', 'p1r8', 'p1r9'])
  assert.deepEqual(out.slice(-2).map((r) => r.kind), ['burst', 'full'])
  assert.deepEqual(out.filter((r) => r.kind === 'rally').map((r) => r.rally_rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test('no badges yet: a single part sending every rally still shows only the top 10 by score', () => {
  const reels = [...Array.from({ length: 15 }, (_, i) => badgedRally(1, i + 1, 50 + i, null)), other(1, 'burst'), other(1, 'full')]
  const out = mergeParts(reels)
  assert.equal(out.filter((r) => r.kind === 'rally').length, MAX_RALLIES)
  assert.equal(out[0].id, 'p1r15')
})

test('badges across parts are all shown, the rest by score across parts', () => {
  const reels = [
    badgedRally(1, 1, 40, 'First Strike'), badgedRally(1, 2, 80, null), other(1, 'burst'), other(1, 'full'),
    badgedRally(2, 1, 30, 'Quick Hands'), badgedRally(2, 2, 70, null), other(2, 'burst'), other(2, 'full'),
  ]
  assert.deepEqual(mergeParts(reels).map((r) => r.id), ['p1r1', 'p2r1', 'p1r2', 'p2r2', 'p2burst', 'p2full'])
})
