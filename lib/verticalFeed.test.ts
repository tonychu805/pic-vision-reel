import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clip, verticalFeed, type FeedReel } from './verticalFeed'

const reels: FeedReel[] = [
  { id: 'a', kind: 'rally', rally_rank: 1, badge: 'Kitchen War', duration_sec: 14 },
  { id: 'b', kind: 'rally', rally_rank: 2, duration_sec: 9 },
  { id: 'c', kind: 'rally', rally_rank: 3, duration_sec: 11 },
  { id: 'q', kind: 'burst', rally_rank: null, duration_sec: 30 },
]

test('no 9:16 crop at all: no vertical feed (the page stays wide)', () => {
  assert.equal(verticalFeed(reels, { videos: { a: 'A', b: 'B', c: 'C', q: 'Q' } }), null)
  assert.equal(verticalFeed(reels, { videos: { a: 'A' }, vertical: {} }), null)
})

test('one crop is enough: every rally clip is in the feed, in order, cropped or fitted', () => {
  const feed = verticalFeed(reels, { videos: { a: 'A', b: 'B', c: 'C', q: 'Q' }, vertical: { a: 'Av' } })!
  assert.deepEqual(feed.map((c) => c.id), ['a', 'b', 'c'], 'rally clips only, page order kept')
  assert.deepEqual(feed[0], { id: 'a', rallyRank: 1, badge: 'Kitchen War', durationSec: 14, videoUrl: 'Av', wide: false, wideUrl: 'A' })
  assert.deepEqual(feed[1], { id: 'b', rallyRank: 2, badge: null, durationSec: 9, videoUrl: 'B', wide: true, wideUrl: null })
})

test('a clip with no video at all is left out', () => {
  const feed = verticalFeed(reels, { videos: { a: 'A', c: 'C' }, vertical: { a: 'Av' } })!
  assert.deepEqual(feed.map((c) => c.id), ['a', 'c'])
})

test('refreshed addresses: a clip whose crop has since arrived switches to it', () => {
  assert.equal(clip(reels[1], { videos: { b: 'B2' } }).videoUrl, 'B2')
  const later = clip(reels[1], { videos: { b: 'B3' }, vertical: { b: 'Bv' } })
  assert.equal(later.videoUrl, 'Bv')
  assert.equal(later.wide, false)
  assert.equal(later.wideUrl, 'B3')
})
