import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextToPrefetch, slidesToLoad } from './loadWindow'

test('the slide on screen and the next one, never past the end', () => {
  assert.deepEqual(slidesToLoad(0, 12), [0, 1])
  assert.deepEqual(slidesToLoad(5, 12), [5, 6])
  assert.deepEqual(slidesToLoad(11, 12), [11])
  assert.deepEqual(slidesToLoad(0, 1), [0])
})

test('the rest load one at a time, ahead of the viewer first, until every clip is ready', () => {
  const done = new Set([0, 1])
  const order: number[] = []
  for (let i = nextToPrefetch(0, 5, 0, (j) => done.has(j)); i !== null; i = nextToPrefetch(0, 5, 0, (j) => done.has(j))) {
    order.push(i)
    done.add(i)
  }
  assert.deepEqual(order, [2, 3, 4])
  assert.equal(nextToPrefetch(3, 5, 0, (j) => j === 3 || j === 4), 0)
})

test('nothing starts while another clip is still downloading', () => {
  assert.equal(nextToPrefetch(0, 5, 1, () => false), null)
})
