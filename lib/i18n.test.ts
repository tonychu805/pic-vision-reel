import assert from 'node:assert/strict'
import { test } from 'node:test'
import { missingKeys, pickLang, t } from './i18n'

test("a saved choice wins; otherwise the phone's language; any Chinese gets Traditional", () => {
  assert.equal(pickLang('en', 'zh-TW,zh;q=0.9'), 'en')
  assert.equal(pickLang('zh-TW', 'en-US'), 'zh-TW')
  assert.equal(pickLang(null, 'zh-TW,zh;q=0.9,en;q=0.8'), 'zh-TW')
  assert.equal(pickLang(null, 'zh-CN'), 'zh-TW')
  assert.equal(pickLang(null, 'en-US,en;q=0.9'), 'en')
  assert.equal(pickLang(null, 'ja-JP,zh-TW;q=0.5'), 'zh-TW')
  assert.equal(pickLang(null, 'en;q=0.5,zh-Hant;q=0.9'), 'zh-TW')
  assert.equal(pickLang(null, 'ja-JP'), 'en')
  assert.equal(pickLang('fr', undefined), 'en')
})

test('every string exists in both languages, and placeholders fill in', () => {
  assert.deepEqual(missingKeys(), [])
  assert.equal(t('en', 'rally', { n: 3 }), 'Rally 3')
  assert.equal(t('zh-TW', 'rally', { n: 3 }), '精彩回合 3')
  assert.equal(t('zh-TW', 'shareTitleOne', { venue: 'PGC' }), 'PGC — 匹克球精彩片段')
})
