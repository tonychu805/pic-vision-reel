const assert = require('node:assert/strict')
const { test } = require('node:test')
const { chromium } = require('playwright')

// Check the deployed HTML, not a local build: Netlify injects its Drawer
// after deployment. Our frame-src intentionally does not allow its iframe;
// leaving that overlay enabled produces a blank fixed bar on mobile.
test('deployed preview has no injected Netlify Drawer covering the page', { timeout: 150000 }, async () => {
  assert.ok(process.env.PREVIEW_URL, 'Set PREVIEW_URL to the preview origin')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const url = new URL('/login', process.env.PREVIEW_URL).href
    // A new PR's preview may still be building when CI starts.
    const deadline = Date.now() + 120000
    let response
    while (Date.now() < deadline) {
      response = await page.goto(url, { timeout: 20000 })
      if (response?.ok()) break
      await page.waitForTimeout(5000)
    }
    assert.ok(response?.ok(), 'Preview login page must be available')
    assert.equal(await page.locator('script[src*="/.netlify/scripts/cdp"]').count(), 0, 'Disable Netlify Drawer in site Collaboration tools settings')
    assert.equal(await page.locator('iframe[title="Netlify Drawer"]').count(), 0, 'No preview toolbar should cover the page')
  } finally {
    await browser.close()
  }
})
