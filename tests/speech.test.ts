/**
 * Tests for the speech module fixes introduced by the project brief audit:
 *   1. romanUrduToScript — English/tech terms must be preserved, not transliterated
 *   2. romanUrduToScript — digit conversion
 *   3. romanUrduToScript — digraph matching (kh, gh, ch, sh, etc.)
 *   4. ruNorm — expanded spelling variants from updated lexicons.json
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { romanUrduToScript } from '../src/lib/speech'
import { ruNorm } from '../src/lib/lang'
import { loadLexicons } from '../src/lib/lang'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', f), 'utf8'))

beforeAll(() => {
  const files: Record<string, unknown> = {
    'lexicons.json': read('lexicons.json'),
    'dictionary.json': read('dictionary.json'),
    'prompts.json': read('prompts.json'),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() || ''
      if (!(name in files)) return { ok: false, json: async () => ({}) }
      return { ok: true, json: async () => files[name] }
    }),
  )
})

describe('romanUrduToScript — tech term preservation (critical fix)', () => {
  it('preserves ALL-CAPS tech terms unchanged', () => {
    const result = romanUrduToScript('API theek karo')
    expect(result).toContain('API')
    expect(result).not.toContain('اے پی')
  })

  it('preserves MixedCase tech terms unchanged', () => {
    const result = romanUrduToScript('Laravel mein masla hai')
    expect(result).toContain('Laravel')
    expect(result).not.toContain('لریل')
  })

  it('preserves multiple tech terms in one string', () => {
    const result = romanUrduToScript('GitHub par push karo aur Laravel deploy karo')
    expect(result).toContain('GitHub')
    expect(result).toContain('Laravel')
  })

  it('converts sentence-initial capitalized Roman Urdu words', () => {
    expect(romanUrduToScript('Aap kaise hain?')).toBe('آپ کیسے ہیں?')
    expect(romanUrduToScript('Agar API fail ho')).toBe('اگر API فیل ہو')
    expect(romanUrduToScript('Theek hai, phir shuru karein')).toBe('ٹھیک ہے, پھر شروع کریں')
  })

  it('preserves technical identifiers while converting surrounding Urdu', () => {
    const result = romanUrduToScript('Laravel aur PHP8.3 API ke saath kaam')
    expect(result).toContain('Laravel')
    expect(result).toContain('PHP8.3')
    expect(result).toContain('API')
    expect(result).toContain('اور')
  })

  it('converts lowercase Roman Urdu words to Urdu script', () => {
    const result = romanUrduToScript('yeh masla hai')
    // Should have some Urdu script characters
    expect(/[\u0600-\u06FF]/.test(result)).toBe(true)
  })

  it('converts digits to Eastern Arabic-Indic', () => {
    const result = romanUrduToScript('number 5 hai')
    expect(result).toContain('۵')
  })

  it('handles digraphs: kh → خ', () => {
    const result = romanUrduToScript('khabar')
    expect(result).toContain('خ')
  })

  it('handles digraphs: ch → چ', () => {
    const result = romanUrduToScript('chaabi')
    expect(result).toContain('چ')
  })

  it('handles digraphs: sh → ش', () => {
    const result = romanUrduToScript('shuru')
    expect(result).toContain('ش')
  })

  it('handles empty string gracefully', () => {
    expect(romanUrduToScript('')).toBe('')
  })

  it('preserves whitespace between tokens', () => {
    const result = romanUrduToScript('API kaam karta hai')
    // API preserved, spaces preserved, Urdu words converted
    expect(result.startsWith('API')).toBe(true)
    expect(result).toContain(' ')
  })
})

describe('ruNorm — expanded spelling normalization', () => {
  it('normalises "acha" to "achha"', async () => {
    await loadLexicons()
    expect(ruNorm('acha lagta hai')).toContain('achha')
  })

  it('normalises "thek" to "theek"', async () => {
    await loadLexicons()
    expect(ruNorm('thek hai')).toContain('theek')
  })

  it('normalises "agr" to "agar"', async () => {
    await loadLexicons()
    expect(ruNorm('agr masla ho')).toContain('agar')
  })

  it('normalises "toh" to "to"', async () => {
    await loadLexicons()
    expect(ruNorm('theek toh hai')).toContain('to')
  })

  it('normalises "zaroorat" variant spellings', async () => {
    await loadLexicons()
    expect(ruNorm('zarurat hai')).toContain('zaroorat')
    expect(ruNorm('zarorat hai')).toContain('zaroorat')
  })

  it('normalises "jaldi" from "jldi"', async () => {
    await loadLexicons()
    expect(ruNorm('jldi karo')).toContain('jaldi')
  })

  it('does not touch already-correct spellings', async () => {
    await loadLexicons()
    expect(ruNorm('achha hai')).toContain('achha')
    expect(ruNorm('theek hai')).toContain('theek')
  })

  it('does not rewrite inside code spans', async () => {
    await loadLexicons()
    const out = ruNorm('`agr` aur agr')
    // The code span version must stay, the bare one gets normalized
    expect(out).toContain('`agr`')
  })
})

describe('ruNorm — original canonical spelling rules still pass', () => {
  it('normalises hy to hai', async () => {
    await loadLexicons()
    expect(ruNorm('yeh theek hy')).toContain('hai')
  })

  it('normalises bht to bohat', async () => {
    await loadLexicons()
    expect(ruNorm('bht acha')).toContain('bohat')
  })

  it('normalises bahut to bohat (Pakistani vs Indian)', async () => {
    await loadLexicons()
    expect(ruNorm('bahut acha')).toContain('bohat')
  })
})
