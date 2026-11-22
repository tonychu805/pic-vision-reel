import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openedFromShare, parseActivity, sharedLink, viewThreshold } from './activity'

const SHARE = '6dc5cbdc-e132-4d32-846e-d285106715cb'
const REEL = 'f3bc998a-8708-4a05-890d-67586c55e9b3'

test('a well-formed event is accepted as sent', () => {
  assert.deepEqual(parseActivity({ shareId: SHARE, kind: 'clip_view', reelId: REEL }), { shareId: SHARE, kind: 'clip_view', reelId: REEL, viaShare: false })
  assert.deepEqual(parseActivity({ shareId: SHARE, kind: 'page_open', viaShare: true }), { shareId: SHARE, kind: 'page_open', reelId: null, viaShare: true })
})

test('anything else is refused', () => {
  assert.equal(parseActivity(null), null)
  assert.equal(parseActivity('page_open'), null)
  assert.equal(parseActivity({ shareId: 'nope', kind: 'page_open' }), null)
  assert.equal(parseActivity({ shareId: SHARE, kind: 'delete_everything' }), null)
  assert.equal(parseActivity({ shareId: SHARE, kind: 'download', reelId: 'x' }), null)
})

test('a shared link carries the marker, and only that marker counts', () => {
  const link = sharedLink(`https://share.picvisionai.com/r/${SHARE}`)
  assert.equal(link, `https://share.picvisionai.com/r/${SHARE}?from=share`)
  assert.equal(openedFromShare(new URL(link).search), true)
  assert.equal(sharedLink(link), link)
  assert.equal(openedFromShare(''), false)
  assert.equal(openedFromShare('?from=line'), false)
})

test('a clip counts as watched after 3 s, or half of a shorter clip', () => {
  assert.equal(viewThreshold(20), 3)
  assert.equal(viewThreshold(4), 2)
})
