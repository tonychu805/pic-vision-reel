import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchVideoBlob } from './videoDownload'

test('download returns the video bytes on success and rejects HTTP error bodies', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('video bytes', { headers: { 'Content-Type': 'video/mp4' } })
    const blob = await fetchVideoBlob('https://example.com/clip.mp4')
    assert.equal(blob.type, 'video/mp4')
    assert.equal(await blob.text(), 'video bytes')
    globalThis.fetch = async () => new Response('upstream failure', { status: 503 })
    await assert.rejects(fetchVideoBlob('https://example.com/clip.mp4'), /HTTP 503/)
    globalThis.fetch = async () => { throw new TypeError('offline') }
    await assert.rejects(fetchVideoBlob('https://example.com/clip.mp4'), /offline/)
  } finally {
    globalThis.fetch = original
  }
})
