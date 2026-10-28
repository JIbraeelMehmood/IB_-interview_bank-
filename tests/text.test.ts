import { describe, expect, it } from 'vitest'
import { alignWords, bidiFix, enSay, esc, md, splitText, stripHtml, words } from '../src/lib/text'

describe('display helpers', () => {
  it('escapes html', () => {
    expect(esc('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;')
  })

  it('wraps Latin runs in bdi so Urdu lines do not jumble', () => {
    const out = bidiFix('یہ queue ایک اہم چیز ہے')
    expect(out).toContain('<bdi dir="ltr" class="en">queue</bdi>')
  })

  it('does not wrap inside code', () => {
    const out = bidiFix('`someCode`')
    expect(out).toContain('<code>someCode</code>')
    expect(out).not.toContain('bdi')
  })

  it('renders markdown safely', () => {
    expect(md('**bold**')).toContain('<b>bold</b>')
    expect(md('<img onerror=x>')).toContain('&lt;img')
  })

  it('strips html to plain text', () => {
    expect(stripHtml('<p>Hello <b>world</b></p><p>Next</p>')).toBe('Hello world Next')
  })
})

describe('TTS preparation (enSay)', () => {
  it('expands abbreviations the voice misreads', () => {
    expect(enSay('JSON')).toBe('Jason')
    expect(enSay('nginx')).toBe('engine X')
    expect(enSay('SQL')).toBe('S Q L')
    expect(enSay('e.g. 5')).toBe('for example 5')
  })

  it('removes symbols and code markers', () => {
    expect(enSay('`foo()` **bar**')).toBe('foo() bar')
  })
})

describe('byte-safe splitText', () => {
  it('splits by bytes, not characters, so Devanagari fits the prompt limit', () => {
    const hindi = 'यह एक बहुत लंबा हिंदी ट्रांसक्रिप्ट है जिसमें बहुत सारे शब्द हैं और यह सीमा से आगे जाता है।'
    const parts = splitText(hindi.repeat(400), 30 * 1024)
    const enc = new TextEncoder()
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(enc.encode(p).length).toBeLessThanOrEqual(30 * 1024 + 4096)
  })

  it('returns one part for short text', () => {
    expect(splitText('short')).toEqual(['short'])
  })
})

describe('pronunciation alignment', () => {
  it('scores a perfect repeat at 100', () => {
    const r = alignWords('I have five years of experience', 'I have five years of experience')
    expect(r.score).toBe(100)
  })

  it('drops the score for missing words', () => {
    const r = alignWords('queue worker horizon supervisor', 'queue worker')
    expect(r.score).toBeLessThan(100)
    expect(r.score).toBe(50)
  })

  it('is case and punctuation insensitive', () => {
    expect(alignWords('Laravel, Redis!', 'laravel redis').score).toBe(100)
  })

  it('splits on words only', () => {
    expect(words('Hello, world! 42')).toEqual(['hello', 'world', '42'])
  })
})
