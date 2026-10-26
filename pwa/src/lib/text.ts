/** Text helpers for display and for speech. Ported from v7 so the output
 *  (and the bugs it fixed) carry over unchanged. */

import { dict, dictHi, dictUr } from './lang'
import type { Lang } from './types'

/** Escape text for safe innerHTML. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Wrap Latin runs inside RTL (Urdu) text in <bdi dir="ltr">.
 * This is the v7 fix for English words and punctuation jumbling in RTL lines.
 */
export function bidiFix(html: string): string {
  // Split first: the Latin-run regex must never see the inside of a <code> tag,
  // otherwise it wraps the word "code" as well as its contents.
  return String(html)
    .split(/(`[^`]+`)/g)
    .map((part) =>
      part.startsWith('`') && part.endsWith('`')
        ? `<code>${esc(part.slice(1, -1))}</code>`
        : part.replace(
            /\b([A-Za-z][A-Za-z0-9_+#.\-/]*(?:[ ]+[A-Za-z0-9_+#.\-/]+)*)\b/g,
            (m) => `<bdi dir="ltr" class="en">${m}</bdi>`,
          ),
    )
    .join('')
}

/** Render markdown-ish text to safe HTML. Small subset, no dependency. */
export function md(text: string): string {
  if (!text) return ''
  let s = esc(text)
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
  s = s.replace(/`([^`\n]+)`/g, (_, code) => `<code>${code}</code>`)
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
  s = s.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
  s = s.replace(/(^|\n)[-*•]\s+/g, '$1• ')
  s = s.replace(/(^|\n)(\d+)\.\s+/g, '$1$2. ')
  s = s.replace(/\n{2,}/g, '</p><p>')
  s = s.replace(/\n/g, '<br>')
  return `<p>${s}</p>`
}

/** Wrap AI markdown output in the right direction for the language. */
export function mdL(text: string, lang: Lang): string {
  const html = md(text)
  return lang === 'ur' ? `<div dir="rtl" class="ur">${bidiFix(html)}</div>` : html
}

/** English text rewritten so a TTS voice pronounces it correctly. */
export function enSay(text: string): string {
  let s = String(text || '')
  s = s.replace(/`([^`]+)`/g, '$1')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/\bJSON\b/g, 'Jason')
  s = s.replace(/\bnginx\b/gi, 'engine X')
  s = s.replace(/\bSQLite\b/g, 'S Q L Lite')
  s = s.replace(/\bSQL\b/g, 'S Q L')
  s = s.replace(/\bMySQL\b/g, 'My S Q L')
  s = s.replace(/\bCSS\b/g, 'C S S')
  s = s.replace(/\bHTML\b/g, 'H T M L')
  s = s.replace(/\bAPI\b/g, 'A P I')
  s = s.replace(/\bPHP\b/g, 'P H P')
  s = s.replace(/\bCLI\b/g, 'C L I')
  s = s.replace(/\bAWS\b/g, 'A W S')
  s = s.replace(/\bJWT\b/g, 'J W T')
  s = s.replace(/\bETag\b/g, 'E Tag')
  s = s.replace(/\bACID\b/g, 'A C I D')
  s = s.replace(/\bMVVM\b/g, 'M V V M')
  s = s.replace(/\bSSR\b/g, 'S S R')
  s = s.replace(/\bCDN\b/g, 'C D N')
  s = s.replace(/\bUI\b/g, 'U I')
  s = s.replace(/\bVM\b/g, 'V M')
  s = s.replace(/\be\.g\./g, 'for example')
  s = s.replace(/\bi\.e\./g, 'that is')
  s = s.replace(/&[a-z]+;/g, ' ')
  s = s.replace(/[|~^*_#<>{}[\]]/g, ' ')
  s = s.replace(/\s{2,}/g, ' ')
  return s.trim()
}

const ABBR =
  /^(PHP|MySQL|PostgreSQL|Redis|Vue|JS|TS|UI|UX|API|REST|GraphQL|HTML|CSS|Linux|Mac|Kubernetes|Docker|Laravel|React|Graph|iOS|macOS|Git|GitHub|AWS|GCP|CDN|DNS|SSL|TLS|VPN|SQS|S3|EC2|RDS|VPC|IAM|CI|CD|MVC|MVVM|CQRS|ORM|SPA|PWA|RPC|FTP|SSH|JWT|ETag|CORS|CSRF|XSS|SQL|Mongo|NoSQL|DevOps|LLM|RAG|AI|MCP|RL|MFA|OTP|2FA|KB|MB|GB|TB|ms|GBps)$/

/**
 * Rewrite English tech words inside Urdu/Hindi text into the speech script,
 * using the 260-term dictionary, so the voice says them the Urdu/Hindi way.
 * Used as the safety net for *all* speech, including AI "say" text.
 */
export async function speechify(text: string, script: 'ur' | 'hi'): Promise<string> {
  if (!text) return text
  const m = await dict()
  const keys = [...m.keys()].filter((k) => !ABBR.test(k)).sort((a, b) => b.length - a.length)
  if (!keys.length) return text
  const re = new RegExp(
    `\\b(${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi',
  )
  return text.replace(re, (hit) => {
    const lower = hit.toLowerCase()
    const row = m.get(lower)
    if (!row) return hit
    if (ABBR.test(lower)) return lower.split('').join(' ')
    return script === 'ur' ? row[1] : row[2]
  })
}

/** Convert English tech words in a mixed sentence to Urdu script. */
export const urSpeech = (text: string) => speechify(text, 'ur')
/** Convert English tech words in a mixed sentence to Devanagari. */
export const hiSpeech = (text: string) => speechify(text, 'hi')

/** Word list for the pronunciation dictionary screen. */
export async function glossList(): Promise<{ en: string; ur: string; hi: string }[]> {
  const m = await dict()
  return [...m.values()].map((r) => ({ en: r[0], ur: r[1], hi: r[2] }))
}

export { dictUr, dictHi }

/** Byte-aware split — Devanagari/Urdu use ~3 bytes per character, so the v7
 *  character-based split blew the 64 KB prompt limit. */
export function splitText(text: string, maxBytes = 30 * 1024): string[] {
  const enc = new TextEncoder()
  const size = (s: string) => enc.encode(s).length
  if (size(text) <= maxBytes) return [text]
  const out: string[] = []
  let cur = ''
  for (const para of text.split(/\n{2,}/)) {
    if (size(cur) + size(para) + 2 <= maxBytes) {
      cur += (cur ? '\n\n' : '') + para
    } else {
      if (cur) out.push(cur)
      if (size(para) <= maxBytes) {
        cur = para
      } else {
        // Split a long paragraph on sentence boundaries.
        let piece = ''
        for (const sent of para.split(/(?<=[.!?؟۔])\s+/)) {
          if (size(sent) > maxBytes) {
            // One unbroken run (minified text, no spaces): hard-wrap it.
            if (piece) {
              out.push(piece)
              piece = ''
            }
            for (let i = 0; i < sent.length; ) {
              let take = 1
              while (i + take < sent.length && size(sent.slice(i, i + take + 1)) <= maxBytes) take++
              out.push(sent.slice(i, i + take))
              i += take
            }
            continue
          }
          if (size(piece) + size(sent) + 1 > maxBytes) {
            if (piece) out.push(piece)
            piece = sent
          } else {
            piece += (piece ? ' ' : '') + sent
          }
        }
        cur = piece
      }
    }
  }
  if (cur) out.push(cur)
  return out
}

/** Word-level alignment for pronunciation scoring. */
export function alignWords(target: string, heard: string) {
  const a = words(target)
  const b = words(heard)
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ok = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ok[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const hit = ok.filter(Boolean).length
  return { words: a, ok, score: n ? Math.round((hit / n) * 100) : 0 }
}

export function words(t: string): string[] {
  return String(t || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}


/** Strip HTML to plain text (kept here so prompts and search share one rule). */
export function stripHtml(html: string): string {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
