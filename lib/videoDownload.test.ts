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

// Paired with the test above: the prefetch must bypass the HTTP cache, or a
// response the <video> element cached without CORS headers is reused for
// this CORS fetch and fails (2026-10-29).
test('download bypasses the HTTP cache and keeps the caller\'s other options', async () => {
  const original = globalThis.fetch
  try {
    let seen: RequestInit | undefined
    globalThis.fetch = async (_url, init) => { seen = init; return new Response('v', { headers: { 'Content-Type': 'video/mp4' } }) }
    await fetchVideoBlob('https://example.com/clip.mp4', { priority: 'high' } as RequestInit)
    assert.equal(seen?.cache, 'no-store')
    assert.equal((seen as RequestInit & { priority?: string }).priority, 'high')
  } finally {
    globalThis.fetch = original
  }
})
