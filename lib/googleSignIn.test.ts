import { test } from 'node:test'
import assert from 'node:assert/strict'
import { googleAuthUrl, readState, encodeState, safeNext, sha256Hex } from './googleSignIn'

test('the Google URL sends players back to our own address, with the hashed nonce', () => {
  const url = new URL(googleAuthUrl({ clientId: 'cid', redirectUri: 'https://share.picvisionai.com/auth/google/callback', state: 's1', nonceHash: 'h1', selectAccount: false }))
  assert.equal(url.host, 'accounts.google.com')
  assert.equal(url.searchParams.get('redirect_uri'), 'https://share.picvisionai.com/auth/google/callback')
  assert.equal(url.searchParams.get('nonce'), 'h1')
  assert.equal(url.searchParams.get('scope'), 'openid email profile')
  assert.equal(url.searchParams.get('prompt'), null)
})

test('sign-up always shows the account chooser', () => {
  const url = new URL(googleAuthUrl({ clientId: 'c', redirectUri: 'r', state: 's', nonceHash: 'h', selectAccount: true }))
  assert.equal(url.searchParams.get('prompt'), 'select_account')
})

test('the returned state must match the one this browser started', () => {
  const cookie = encodeState({ state: 'abc', nonce: 'n', next: '/club/x', consent: true, promo: false })
  assert.deepEqual(readState(cookie, 'abc'), { state: 'abc', nonce: 'n', next: '/club/x', consent: true, promo: false })
  assert.equal(readState(cookie, 'other'), null)
  assert.equal(readState(undefined, 'abc'), null)
  assert.equal(readState('not json', 'abc'), null)
})

test('next never leaves the site', () => {
  assert.equal(safeNext('//evil.example'), '/')
  assert.equal(safeNext('https://evil.example'), '/')
  assert.equal(readState(encodeState({ state: 'a', nonce: 'n', next: '//evil.example', consent: false, promo: false }), 'a')?.next, '/')
})

test('the nonce hash is SHA-256 hex, as Supabase compares it', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
