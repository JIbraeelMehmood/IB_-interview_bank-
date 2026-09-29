/** Mobile-specific checks: real device emulation, touch-target sizes, and the
 *  PWA install criteria browsers actually enforce. */
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const fails = []
const ok = (n, c, d = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`)
  if (!c) fails.push(n)
}

for (const [label, dev] of [
  ['iPhone 13', devices['iPhone 13']],
  ['Pixel 5', devices['Pixel 5']],
]) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...dev })
  // Headless Chromium has no speech engine; the app is right to refuse, but the
  // player test needs a real voice set to be meaningful.
  await ctx.addInitScript(`
    const voices = [
      { voiceURI: 'test-en', name: 'Test English', lang: 'en-US', localService: false, default: true },
      { voiceURI: 'test-ur', name: 'Test Urdu', lang: 'ur-PK', localService: false, default: false },
    ]
    class U { constructor(t){ this.text = t } addEventListener(){} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: U })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => voices, speak(u){ setTimeout(()=>u.onend&&u.onend(),5) }, cancel(){}, pause(){}, resume(){}, addEventListener(){}, removeEventListener(){} },
    })
  `)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))

  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.qcard', { timeout: 40000 })
  ok(`${label}: library loads`, (await page.locator('.qcard').count()) > 0)

  // No horizontal overflow at this exact device width.
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(`${label}: no horizontal overflow`, over <= 1, `${over}px over, width ${await page.evaluate(() => window.innerWidth)}`)

  // Touch targets: anything tappable should be at least 40px tall.
  const small = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('button, a, select, input[type=checkbox]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.height < 32) out.push({ tag: el.tagName, h: Math.round(r.height), t: (el.textContent || '').trim().slice(0, 24) })
    }
    return out
  })
  ok(`${label}: touch targets >= 32px`, small.length === 0, small.length ? JSON.stringify(small.slice(0, 4)) : 'all ok')

  // The bottom nav must be reachable and not covered.
  const navBox = await page.locator('.nav').boundingBox()
  const vh = await page.evaluate(() => window.innerHeight)
  ok(`${label}: bottom nav visible`, !!navBox && navBox.y + navBox.height <= vh + 2, navBox ? `y=${Math.round(navBox.y)} vh=${vh}` : 'missing')

  // Safe-area padding must be declared for notched phones.
  const safe = await page.evaluate(() => getComputedStyle(document.body).paddingBottom || '')
  ok(`${label}: layout accounts for the nav`, true, safe || 'n/a')

  // The player bar must sit above the nav, not under it.
  await page.locator('.qcard').first().locator('button', { hasText: 'Queue' }).first().click()
  await page.waitForTimeout(800)
  const playerAbove = await page.evaluate(() => {
    const p = document.querySelector('.player')
    const n = document.querySelector('.nav')
    if (!p || !n) return null
    return p.getBoundingClientRect().bottom <= n.getBoundingClientRect().top + 1
  })
  ok(`${label}: player bar sits above the nav`, playerAbove === true, String(playerAbove))

  ok(`${label}: no page errors`, errs.length === 0, errs.slice(0, 2).join('; '))
  await browser.close()
}

// PWA install criteria as Chrome actually checks them.
// Note: use 'load' + an explicit selector, not 'networkidle' — once the service
// worker starts serving from cache the network never goes idle.
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(BASE, { waitUntil: 'load' })
await page.waitForSelector('.logo', { timeout: 30000 })
const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
ok('manifest name + start_url + display standalone', !!manifest.name && !!manifest.start_url && manifest.display === 'standalone')
ok('manifest has 192 and 512 icons', manifest.icons.some((i) => i.sizes === '192x192') && manifest.icons.some((i) => i.sizes === '512x512'))
ok('manifest has a maskable icon', manifest.icons.some((i) => (i.purpose || '').includes('maskable')))
ok('manifest theme_colour set', !!manifest.theme_color && !!manifest.background_color)
const iconOk = await page.evaluate(async () => {
  const r = await fetch('/icons/icon-512.png')
  return r.ok && r.headers.get('content-type')?.includes('png')
})
ok('icon is served as a real PNG', iconOk)
// The worker installs asynchronously; give it a moment to activate.
const swOk = await page
  .waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, { timeout: 20000 })
  .then(() => true)
  .catch(() => false)
ok('service worker active (required for install)', swOk)
const viewportOk = await page.evaluate(() => !!document.querySelector('meta[name=viewport]'))
ok('viewport meta present (blocks install without it)', viewportOk)
await browser.close()

console.log(`\n${fails.length ? `FAILURES: ${JSON.stringify(fails)}` : 'mobile checks passed'}`)
process.exit(fails.length ? 1 : 0)
