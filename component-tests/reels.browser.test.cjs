const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { bundleClients } = require('./clientHarness.cjs')

let server, browser, origin
const contexts = []
const shareId = '11111111-1111-4111-8111-111111111111'
const endpoint = `https://console.picvisionai.com/api/share/${shareId}/videos`

before(async () => {
  const bundle = bundleClients()
  const config = (await import('../next.config.mjs')).default
  const csp = (await config.headers())[0].headers.find((h) => h.key === 'Content-Security-Policy').value
  server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'text/javascript')
      return res.end(bundle)
    }
    if (req.url.startsWith('/clip')) {
      res.setHeader('Content-Type', 'video/mp4')
      return res.end('fixture video bytes')
    }
    res.setHeader('Content-Security-Policy', csp)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<!doctype html><html><body><div id="app"></div><script src="/bundle.js"></script></body></html>')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await Promise.all(contexts.map((c) => c.close()))
  await browser?.close()
  if (server) await new Promise((resolve) => server.close(resolve))
})

function props() {
  return {
    shareId, slides: [0, 1, 2].map((i) => ({ id: `v${i}`, kind: 'rally', rallyRank: i + 1,
      videoUrl: `${origin}/clip${i}.mp4`, durationSec: 2, rallyCount: 1, badge: null })),
    addressesExpireAt: new Date(Date.now() + 3600000).toISOString(), videosEndpoint: endpoint,
    venueName: 'Review venue', logoKey: null, logoInk: null, cameraLabel: 'Court 1',
    createdAt: new Date().toISOString(), lang: 'en',
  }
}
async function setup() {
  const context = await browser.newContext()
  contexts.push(context)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  await page.goto(origin)
  await page.waitForFunction(() => !!window.mount)
  await page.evaluate(() => {
    window.shared = []
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: async (data) => {
      window.shared.push(await Promise.all(data.files.map(async (f) => ({ name: f.name, body: await f.text() }))))
    }, configurable: true })
  })
  return page
}

// Pair the original failures with success/recovery, including actual file contents.
test('CSP permits video URL refresh and the refreshed addresses are used', async () => {
  const page = await setup()
  const input = props()
  input.addressesExpireAt = '2000-01-01T00:00:00Z'
  await page.route(endpoint, (route) => route.fulfill({
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ expiresAt: new Date(Date.now() + 3600000).toISOString(),
      videos: Object.fromEntries(input.slides.map((s) => [s.id, `${origin}/clip-refreshed-${s.id}.mp4`])) }),
  }))
  const refreshed = page.waitForRequest(`${origin}/clip-refreshed-v0.mp4`)
  await page.evaluate((input) => window.mount('public', input), input)
  await refreshed
  await page.waitForFunction(() => !document.querySelector('.share-tile .tile-spinner'))
  await page.getByRole('button', { name: 'Instagram', exact: true }).click()
  await page.waitForFunction(() => window.shared.length === 1)
  assert.equal(await page.evaluate(() => window.shared[0][0].body), 'fixture video bytes')
})

test('clipboard rejection or missing API never announces success; retry succeeds', async () => {
  const page = await setup()
  await page.evaluate((input) => window.mount('public', input), props())
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => { throw new Error('denied') } }, configurable: true,
  }))
  await page.getByRole('button', { name: /Copy link/ }).click()
  await page.getByRole('alert').filter({ hasText: "Couldn't copy" }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Link copied/ }).count(), 0)
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }))
  await page.getByRole('button', { name: /Copy link/ }).click()
  assert.equal(await page.getByRole('button', { name: /Link copied/ }).count(), 0)
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (text) => { window.copiedText = text } }, configurable: true,
  }))
  await page.getByRole('button', { name: /Copy link/ }).click()
  await page.getByRole('button', { name: /Link copied/ }).waitFor()
  assert.equal(await page.evaluate(() => window.copiedText), `${origin}/r/${shareId}`)
  assert.equal(await page.getByRole('alert').count(), 0)
})

test('failed prefetch is not ready; Download all can retry and shares every valid clip', async () => {
  const page = await setup()
  let failing = true
  let attempts = 0
  await page.route('**/clip1.mp4', (route) => {
    // Only fail the Blob fetch; native media requests are irrelevant to sharing.
    if (route.request().resourceType() !== 'fetch') return route.continue()
    attempts++
    return route.fulfill({ status: failing ? 503 : 200, contentType: failing ? 'text/plain' : 'video/mp4',
      body: failing ? 'upstream failure' : 'recovered video bytes' })
  })
  await page.evaluate((input) => window.mount('public', input), props())
  await page.getByRole('alert').filter({ hasText: "Couldn't load" }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Ready: tap to save all/ }).count(), 0)
  await page.getByRole('button', { name: /Download all/ }).click()
  await page.getByRole('alert').filter({ hasText: "Couldn't load" }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Download all/ }).isEnabled(), true)
  assert.equal(await page.evaluate(() => window.shared.length), 0)
  failing = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('[role=alert]'))
  await page.getByRole('button', { name: /Download all/ }).click()
  await page.waitForFunction(() => window.shared.length === 1)
  const files = await page.evaluate(() => window.shared[0])
  assert.equal(files.length, 3)
  assert.equal(files[1].body, 'recovered video bytes')
  assert.ok(files.every((file) => !file.body.includes('upstream failure')))
  assert.ok(attempts >= 3)
})

test('vertical HTTP errors cannot be shared; retry restores This clip and All clips', async () => {
  const page = await setup()
  let failing = true
  await page.route('**/clip0.mp4', (route) => route.fulfill({ status: failing ? 503 : 200,
    contentType: failing ? 'text/plain' : 'video/mp4', body: failing ? 'upstream failure' : 'recovered video bytes' }))
  const input = { reels: [{ id: 'v0', kind: 'rally', rally_rank: 1, badge: null, duration_sec: 2 }],
    addresses: { videos: { v0: `${origin}/clip0.mp4` }, vertical: { v0: `${origin}/clip0.mp4` } },
    addressesExpireAt: null, videosEndpoint: null, venueName: 'Review venue', gameDate: '2026-10-28',
    court: 'Court 1', when: 'Today', lang: 'en', wideHref: null }
  await page.evaluate((input) => window.mount('vertical', input), input)
  await page.getByRole('alert').waitFor()
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /This clip/ }).isDisabled(), true)
  assert.equal(await page.evaluate(() => window.shared.length), 0)
  failing = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.getByRole('button', { name: /This clip/ }).click()
  await page.waitForFunction(() => window.shared.length === 1)
  assert.equal(await page.evaluate(() => window.shared[0][0].body), 'recovered video bytes')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await page.getByRole('button', { name: /All 1 clips/ }).click()
  await page.waitForFunction(() => window.shared.length === 2)
  assert.equal(await page.evaluate(() => window.shared[1][0].body), 'recovered video bytes')
})

test('bottom navigation stays usable and reserves its full height when the bottom inset grows', async () => {
  const page = await setup()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addStyleTag({ content: fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8').replace(/^@import.*$/gm, '') })
  await page.evaluate(() => window.mount('calendar', {
    lang: 'en', checkin: 'CHECKIN PANEL', sessions: 'SESSIONS PANEL', account: 'ACCOUNT PANEL',
  }))
  const spacerMatchesNav = () => page.waitForFunction(() => {
    const nav = document.querySelector('.bottom-nav')
    const spacer = nav.previousElementSibling
    return Math.abs(nav.getBoundingClientRect().height - spacer.getBoundingClientRect().height) < 1
  })
  await spacerMatchesNav()
  // Desktop browsers don't expose the iPhone inset; exercise the resulting
  // size change explicitly to check the ResizeObserver and reserved space.
  await page.addStyleTag({ content: '.bottom-nav { padding-bottom: 41px; }' })
  await spacerMatchesNav()
  for (const [button, panel] of [['Account', 'ACCOUNT PANEL'], ['Sessions', 'SESSIONS PANEL'], ['Check in', 'CHECKIN PANEL']]) {
    await page.getByRole('navigation').getByRole('button', { name: button, exact: true }).click()
    assert.ok((await page.locator('body').innerText()).includes(panel))
  }
  await page.setViewportSize({ width: 390, height: 664 })
  await spacerMatchesNav()
  assert.equal(await page.locator('.bottom-nav').evaluate((nav) => Math.round(nav.getBoundingClientRect().bottom)), 664)
})
