const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const http = require('node:http')
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

// Send shares the page link; Share attaches the clip (operator, 2026-10-29).
// Until then both attached the clip and a phone could not send the link.
test('vertical Send shares the page link, Share still attaches the clip', async () => {
  const page = await setup()
  await page.route('**/clip0.mp4', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: 'clip bytes' }))
  await page.evaluate(() => {
    window.sends = []
    Object.defineProperty(navigator, 'share', { value: async (data) => {
      window.sends.push({ url: data.url ?? null, files: (data.files ?? []).length })
    }, configurable: true })
  })
  const input = { reels: [{ id: 'v0', kind: 'rally', rally_rank: 1, badge: null, duration_sec: 2 }],
    addresses: { videos: { v0: `${origin}/clip0.mp4` }, vertical: { v0: `${origin}/clip0.mp4` } },
    addressesExpireAt: null, videosEndpoint: null, venueName: 'Review venue', gameDate: '2026-10-28',
    court: 'Court 1', when: 'Today', lang: 'en', wideHref: null }
  await page.evaluate((input) => window.mount('vertical', input), input)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await page.waitForFunction(() => window.sends.length === 1)
  const sent = await page.evaluate(() => window.sends[0])
  assert.equal(sent.files, 0)
  assert.equal(sent.url, await page.evaluate(() => window.location.href))
  // Share waits for the clip to be prefetched, then attaches it.
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/clip0.mp4')))
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await page.waitForFunction(() => window.sends.length === 2)
  assert.equal(await page.evaluate(() => window.sends[1].files), 1)
})

const accountProps = {
  lang: 'en', initialName: 'Old name', initialTraining: false,
  isLineAccount: true, initialEmail: null, hasPassword: false, memberSince: null, showBackLink: false,
}
async function accountPage(overrides = {}) {
  const page = await setup()
  await page.evaluate((input) => {
    window.accountCalls = []
    window.accountResults = {}
    window.runAccountAction = async (action, value) => {
      window.accountCalls.push({ action, value })
      const result = window.accountResults[action]
      if (result === 'throw') throw new Error('Network disconnected')
      return { error: result ?? null }
    }
    window.mount('account', input)
  }, { ...accountProps, ...overrides })
  return page
}

// Since the Court Club account form (2026-10-28) the privacy switch saves the
// moment it moves, and the name is edited inline with its own Save.
test('a failed privacy save flips the switch back with an alert, and a retry saves', async () => {
  const page = await accountPage()
  await page.evaluate(() => { window.accountResults.training = 'consent update rejected' })
  // click, not check(): check() insists the box stays ticked, and here it must not.
  await page.getByRole('checkbox').click()
  await page.getByRole('alert').filter({ hasText: "Couldn't save your privacy preference" }).waitFor()
  assert.equal(await page.getByRole('checkbox').isChecked(), false)
  assert.equal(await page.getByText('Saved.', { exact: true }).count(), 0)
  await page.evaluate(() => { window.accountResults = {} })
  await page.getByRole('checkbox').check()
  await page.getByText('Saved.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.equal(await page.getByRole('checkbox').isChecked(), true)
  assert.equal(await page.evaluate(() => window.accountCalls.filter((c) => c.action === 'training').at(-1).value), true)
})

test('failed name edits stay open with the reason, and exceptions never strand Save', async () => {
  const page = await accountPage()
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByLabel('Name').fill('New name')
  for (const failure of ['database rejected update', 'throw']) {
    await page.evaluate((failure) => { window.accountResults.name = failure }, failure)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: "Couldn't save your name" }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).isEnabled(), true)
    assert.equal(await page.getByLabel('Name').inputValue(), 'New name')
    assert.equal(await page.locator('.account-avatar').innerText(), 'O')
  }
  await page.evaluate(() => { window.accountResults = {} })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.locator('.account-header-name').filter({ hasText: 'New name' }).waitFor()
  assert.equal(await page.locator('.account-avatar').innerText(), 'N')
  assert.equal(await page.getByRole('alert').count(), 0)
  // Removing a name is a valid saved state too.
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByLabel('Name').fill('')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Edit name' }).waitFor()
  assert.equal(await page.locator('.account-avatar').innerText(), '?')
})

test('email and password action exceptions allow a retry with visible feedback', async () => {
  const page = await accountPage({ isLineAccount: false, initialEmail: 'test@example.com', hasPassword: true })
  await page.evaluate(() => { window.accountResults = { email: 'throw', password: 'throw' } })
  await page.locator('input[type=email]').fill('new@example.com')
  await page.locator('input[type=password]').fill('new-password')
  for (const name of ['Change email', 'Change password']) {
    const button = page.getByRole('button', { name, exact: true })
    await button.click()
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.disabled))
    assert.equal(await button.isEnabled(), true)
  }
  assert.ok((await page.locator('body').innerText()).includes('Something went wrong'))
})

test('signing out preserves the venue path for the next login', async () => {
  const page = await accountPage()
  const venuePath = '/pgc/fixturecode'
  await page.evaluate((path) => history.replaceState({}, '', path), venuePath)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/login')
  assert.equal(new URL(page.url()).searchParams.get('next'), venuePath)
})

// Generate a real, playable fixture in the browser; no player footage is
// committed and no external encoder is needed in CI.
async function videoBytes(page) {
  return Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160; canvas.height = 90
    const stream = canvas.captureStream(10)
    const chunks = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    const finished = new Promise((resolve) => { recorder.onstop = resolve })
    recorder.start()
    for (let i = 0; i < 21; i++) {
      canvas.getContext('2d').fillStyle = i % 2 ? 'blue' : 'green'
      canvas.getContext('2d').fillRect(0, 0, 160, 90)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    recorder.stop()
    await finished
    stream.getTracks().forEach((track) => track.stop())
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  }))
}

test('vertical URL refresh preserves playback position, paused state and prepared downloads', async () => {
  const page = await setup()
  const bytes = await videoBytes(page)
  const downloads = []
  await page.route('**/clip*.webm*', (route) => {
    if (route.request().resourceType() === 'fetch') downloads.push(route.request().url())
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '')
    if (range) {
      const start = Number(range[1])
      const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
      return route.fulfill({ status: 206, contentType: 'video/webm', headers: {
        'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
      }, body: bytes.subarray(start, end + 1) })
    }
    return route.fulfill({ contentType: 'video/webm', body: bytes })
  })
  let generation = 0
  await page.route('**/refresh-test', (route) => {
    generation++
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      // Keep expiry due so the test can exercise a second renewal manually.
      expiresAt: '2000-01-01T00:00:00Z',
      videos: { v0: `${origin}/clip-wide.webm?generation=${generation}` },
      vertical: { v0: `${origin}/clip-crop.webm?generation=${generation}` },
    }) })
  })
  await page.evaluate((origin) => {
    window.setInterval = (fn) => { window.refreshTick = fn; return 1 }
    window.clearInterval = () => {}
    window.mount('vertical', {
      reels: [{ id: 'v0', kind: 'rally', rally_rank: 1, duration_sec: 2 }],
      addresses: { videos: { v0: `${origin}/clip-wide.webm` }, vertical: { v0: `${origin}/clip-crop.webm` } },
      addressesExpireAt: '2000-01-01T00:00:00Z', videosEndpoint: `${origin}/refresh-test`,
      venueName: 'Review venue', gameDate: '2026-10-28', court: 'Court 1', when: 'Today', lang: 'en', wideHref: null,
    })
  }, origin)
  await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0)
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await page.getByRole('button', { name: /This clip/ }).waitFor()
  await page.locator('video').evaluate((video) => { video.currentTime = 0.6 })
  await page.evaluate(() => window.refreshTick())
  await page.waitForFunction(() => {
    const video = document.querySelector('video')
    return video.src.includes('generation=1') && !video.paused && video.currentTime >= 0.6
  })
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent.includes('This clip')).disabled)
  assert.ok(downloads.includes(`${origin}/clip-crop.webm?generation=1`))
  assert.ok(downloads.includes(`${origin}/clip-wide.webm?generation=1`))
  // Renewing a paused video must not turn it back on.
  await page.locator('video').evaluate((video) => { video.pause(); video.currentTime = 0.5 })
  await page.waitForFunction(() => !document.querySelector('video').seeking && Math.abs(document.querySelector('video').currentTime - 0.5) < 0.05)
  await page.evaluate(() => window.refreshTick())
  await page.waitForFunction(() => {
    const video = document.querySelector('video')
    return video.src.includes('generation=2') && video.readyState >= 1 && Math.abs(video.currentTime - 0.5) < 0.05
  })
  assert.equal(await page.locator('video').evaluate((video) => video.paused), true)
  await page.getByRole('button', { name: /This clip/ }).click()
  await page.waitForFunction(() => window.shared.length === 1)
  assert.equal(await page.evaluate(() => window.shared[0].length), 1)
})
