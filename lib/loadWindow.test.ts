import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slidesToLoad } from './loadWindow'

test('the slide on screen and the next one, never past the end', () => {
  assert.deepEqual(slidesToLoad(0, 12), [0, 1])
  assert.deepEqual(slidesToLoad(5, 12), [5, 6])
  assert.deepEqual(slidesToLoad(11, 12), [11])
  assert.deepEqual(slidesToLoad(0, 1), [0])
})
