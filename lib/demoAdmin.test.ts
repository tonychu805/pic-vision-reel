import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.DEMO_ADMIN_PASSWORD = 'test-secret-value'

import { checkPassword, isValidAdminCookie, makeAdminCookieValue } from './demoAdmin'

test('checkPassword accepts the right password', () => {
  assert.equal(checkPassword('test-secret-value'), true)
})

test('checkPassword rejects a wrong password', () => {
  assert.equal(checkPassword('nope'), false)
  assert.equal(checkPassword(''), false)
})

test('a cookie minted by makeAdminCookieValue is valid immediately', () => {
  assert.equal(isValidAdminCookie(makeAdminCookieValue()), true)
})

test('an undefined or empty cookie is never valid', () => {
  assert.equal(isValidAdminCookie(undefined), false)
  assert.equal(isValidAdminCookie(''), false)
})

test('a tampered cookie (wrong signature) is rejected', () => {
  const real = makeAdminCookieValue()
  const dot = real.indexOf('.')
  const tampered = `${real.slice(0, dot)}.${'0'.repeat(real.length - dot - 1)}`
  assert.equal(isValidAdminCookie(tampered), false)
})

test('an expired cookie (past expiresAt, correctly signed for that time) is rejected', () => {
  // Mint a cookie for a timestamp already in the past -- same signing
  // function a real cookie uses, just for an expiry that's already gone.
  const { createHmac } = require('crypto') as typeof import('crypto')
  const expiresAt = Date.now() - 1000
  const mac = createHmac('sha256', 'test-secret-value').update(String(expiresAt)).digest('hex')
  assert.equal(isValidAdminCookie(`${expiresAt}.${mac}`), false)
})

test('garbage input does not throw', () => {
  assert.equal(isValidAdminCookie('not-a-real-cookie-at-all'), false)
  assert.equal(isValidAdminCookie('123.'), false)
  assert.equal(isValidAdminCookie('.abc'), false)
})
