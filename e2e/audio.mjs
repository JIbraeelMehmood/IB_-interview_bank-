/** Audio verification.
 *
 *  Headless Chromium ships with no speech engine, so the app correctly reports
 *  "no voices installed" there. This test installs a fake voice set and proves
 *  the real playback path: segments are spoken, the right language's voice is
 *  chosen, and the text is prepared for that voice. It also proves the
 *  no-voice case reports a clear message instead of failing silently. */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const fails = []
const ok = (n, c, d = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`)
  if (!c) fails.push(n)
}

const FAKE_VOICES = `
  const voices = [
    { voiceURI:'test-en-US', name:'Test English (Online)', lang:'en-US', localService:false, default:true },
    { voiceURI:'test-en-GB', name:'Test English UK', lang:'en-GB', localService:false, default:false },
    { voiceURI:'test-ur-PK', name:'Test Urdu Pakistan', lang:'ur-PK', localService:false, default:false },
    { voiceURI:'test-hi-IN', name:'Test Hindi', lang:'hi-IN', localService:false, default:false },
  ]
  window.__spoken = []
  class U {
    constructor(t){ this.text = t; this.voice = null; this.lang = ''; this.rate = 1 }
    addEventListener(){}
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: U })
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak(u) {
        window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.voiceURI })
        setTimeout(() => { if (u.onend) u.onend() }, 5)
      },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
    },
  })
`

const browser = await chromium.launch()

// ---- 1. with voices installed: audio actually plays ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(FAKE_VOICES)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.qcard', { timeout: 40000 })
  await page.waitForTimeout(1000)

  ok('app sees the installed voices', (await page.evaluate(() => speechSynthesis.getVoices().length)) === 4)

  await page.locator('.qcard').first().locator('button', { hasText: 'Listen' }).first().click()
  await page.waitForTimeout(3500)
  const spoken = await page.evaluate(() => window.__spoken)

  ok('Listen speaks the question', spoken.length > 0, `${spoken.length} utterance(s)`)
  const first = spoken[0] || {}
  ok('English uses the English voice', /en-/.test(first.voice || ''), first.voice || 'none')
  ok('speech text is cleaned (JSON becomes Jason)', !/\bJSON\b/.test(spoken.map((s) => s.text).join(' ')))

  // The queue button should also start the player.
  await page.locator('.qcard').first().locator('button', { hasText: 'Queue' }).first().click()
  await page.waitForTimeout(3000)
  const after = await page.evaluate(() => window.__spoken)
  ok('Queue + play speaks too', after.length > spoken.length, `${spoken.length} → ${after.length}`)
  ok('no page errors with voices', errs.length === 0, errs.slice(0, 2).join('; '))
  await ctx.close()
}

// ---- 2. with no voices: a clear message, not silence ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(`
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => [], speak(){}, cancel(){}, pause(){}, resume(){}, addEventListener(){}, removeEventListener(){} },
    })
  `)
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.qcard', { timeout: 40000 })
  await page.waitForTimeout(1000)
  await page.locator('.qcard').first().locator('button', { hasText: 'Listen' }).first().click()
  await page.waitForTimeout(1200)
  const toast = (await page.locator('.toast').textContent().catch(() => '')) || ''
  ok('no-voice device explains the problem', /voice/i.test(toast), toast.trim().slice(0, 80))
  await ctx.close()
}

await browser.close()
console.log(`\n${fails.length ? `FAILURES: ${JSON.stringify(fails)}` : 'audio checks passed'}`)
process.exit(fails.length ? 1 : 0)
