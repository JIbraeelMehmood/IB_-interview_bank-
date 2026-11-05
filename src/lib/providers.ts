/** Provider implementations. Split from `ai.ts` to keep each file readable.
 *
 *  Server mode (Laravel holds the keys) is preferred; client mode calls the
 *  provider directly with the user's own key, so the app still works with no
 *  backend at all.
 */

import {
  AiError,
  PROVIDERS,
  aiReady,
  aiWhy,
  baseFor,
  keyFor,
  keyState,
  saveKeys,
  serverConfigured,
  serverUrl,
  setServerUrl,
  type AiOptions,
  type ChatMessage,
  type ProviderId,
} from './ai'

function httpErr(status: number, body: string): AiError {
  if (status === 402) return new AiError('no_credit', 'No credit left on this account.')
  if (status === 401 || status === 403) return new AiError('bad_key', 'That key was rejected. Check it in AI Connect.')
  if (status === 429) return new AiError('rate_limited', 'Too many requests. Waiting a moment…')
  if (status === 404) return new AiError('bad_model', 'That model is not available on this provider.')
  if (status >= 500) return new AiError('provider_down', 'The provider is having trouble. Try again shortly.')
  return new AiError('bad_request', `Request failed: ${body.slice(0, 200)}`)
}

/** Read an SSE stream, calling onData for each `data:` payload. */
export async function readSSE(
  res: Response,
  onData: (d: any) => void,
  onRaw?: (d: any) => void,
): Promise<void> {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let got = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const d = JSON.parse(payload)
          got = true
          onData(d)
        } catch {
          /* partial JSON — the next block completes it */
        }
      }
    }
  }
  if (!got && onRaw && buf.trim()) {
    try {
      const d = JSON.parse(buf)
      ;(Array.isArray(d) ? d : [d]).forEach(onRaw)
    } catch {
      /* nothing to salvage */
    }
  }
}

export function toMsgs(input: string | ChatMessage[]): ChatMessage[] {
  if (typeof input === 'string') return [{ role: 'user', content: input }]
  return input.map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: String(m.content),
  }))
}

/* ---------------------------- server mode --------------------------- */

export async function serverCall(
  path: string,
  body: Record<string, unknown>,
  opts: AiOptions = {},
): Promise<string> {
  const base = serverUrl()
  if (!base) throw new AiError('no_server', 'No server is set. Add your address in AI Connect.')
  const res = await fetch(`${base}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
    body: JSON.stringify({ task: opts.task || 'quick', ...body }),
    signal: opts.signal,
    credentials: 'include',
  })
  if (!res.ok) throw httpErr(res.status, await res.text().catch(() => ''))

  const ct = res.headers.get('content-type') || ''
  if (opts.onText && ct.includes('event-stream')) {
    let full = ''
    await readSSE(
      res,
      (d) => {
        const delta = d?.delta ?? d?.text ?? d?.content ?? ''
        if (delta) {
          full += delta
          opts.onText?.(delta, full)
        }
      },
      (d) => {
        const text = d?.text ?? d?.content ?? ''
        if (text) {
          full += text
          opts.onText?.(text, full)
        }
      },
    )
    return full
  }

  const data = await res.json()
  const text = data?.text ?? data?.content ?? data?.answer ?? ''
  opts.onText?.(text, text)
  return text
}

/* --------------------------- client mode --------------------------- */

interface ClaudeRuntime {
  use(name: 'sample'): {
    sample(prompt: string, opts?: Record<string, unknown>): Promise<unknown>
    json(prompt: string, opts?: Record<string, unknown>): Promise<unknown>
  }
}

function claudeRuntime(): ClaudeRuntime | null {
  const c = (window as unknown as { claude?: ClaudeRuntime }).claude
  return c && typeof c.use === 'function' ? c : null
}

async function openAiStyle(
  base: string,
  key: string,
  model: string,
  msgs: ChatMessage[],
  opts: AiOptions,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({ model, messages: msgs, stream: !!opts.onText, max_tokens: 4000 }),
    signal: opts.signal,
  })
  if (!res.ok) throw httpErr(res.status, await res.text().catch(() => ''))

  if (opts.onText) {
    let full = ''
    await readSSE(
      res,
      (d) => {
        const delta = d?.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          opts.onText?.(delta, full)
        }
      },
      (d) => {
        const text = d?.choices?.[0]?.message?.content
        if (text) {
          full += text
          opts.onText?.(text, full)
        }
      },
    )
    return full
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

async function geminiCall(
  base: string,
  key: string,
  model: string,
  msgs: ChatMessage[],
  opts: AiOptions,
): Promise<string> {
  const contents = msgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const url = `${base}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
    signal: opts.signal,
  })
  if (!res.ok) throw httpErr(res.status, await res.text().catch(() => ''))
  if (opts.onText) {
    let full = ''
    await readSSE(
      res,
      (d) => {
        const delta = d?.candidates?.[0]?.content?.parts?.[0]?.text
        if (delta) {
          full += delta
          opts.onText?.(delta, full)
        }
      },
      (d) => {
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          full += text
          opts.onText?.(text, full)
        }
      },
    )
    return full
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function anthropicCall(
  base: string,
  key: string,
  model: string,
  msgs: ChatMessage[],
  opts: AiOptions,
): Promise<string> {
  const hasSystem = msgs.length > 1 && msgs[0].content.startsWith('SYSTEM:')
  const system = hasSystem ? msgs[0].content.slice(7) : undefined
  const rest = hasSystem ? msgs.slice(1) : msgs
  const res = await fetch(`${base}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      ...(system ? { system } : {}),
      messages: rest,
      stream: !!opts.onText,
    }),
    signal: opts.signal,
  })
  if (!res.ok) throw httpErr(res.status, await res.text().catch(() => ''))
  if (opts.onText) {
    let full = ''
    await readSSE(
      res,
      (d) => {
        const delta = d?.delta?.text
        if (delta) {
          full += delta
          opts.onText?.(delta, full)
        }
      },
      (d) => {
        const text = d?.content?.[0]?.text
        if (text) {
          full += text
          opts.onText?.(text, full)
        }
      },
    )
    return full
  }
  const data = await res.json()
  return data?.content?.[0]?.text || ''
}

function extraHeaders(p: ProviderId): Record<string, string> {
  if (p === 'openrouter') {
    return {
      'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://interview-box.app',
      'X-Title': 'Interview Box',
    }
  }
  return {}
}

/** Send a chat prompt through whichever provider is configured.
 *
 *  Auto-failover: if the primary provider fails with a network/provider error
 *  (not a bad-key or bad-request), try other configured providers before giving up.
 *  If a local free AI gateway is running (freellmpool / free-ai-gateway), it is
 *  tried first before cloud providers when the primary is 'custom' or when the
 *  primary provider fails.
 */
export async function callProvider(
  input: string | ChatMessage[],
  opts: AiOptions = {},
): Promise<string> {
  const st = keyState()
  const p = st.prov
  if (!aiReady()) throw new AiError('not_ready', aiWhy() || 'AI is not connected.')

  try {
    return await callOneProvider(input, opts, p)
  } catch (e) {
    // Only failover on provider-side errors, not user errors.
    const err = e as AiError
    if (err.code === 'bad_key' || err.code === 'bad_request' || err.code === 'bad_model' || err.code === 'not_ready') {
      throw err
    }
    // Try local gateway first if available
    try {
      const { gatewayUrl, gatewayModel } = await import('./freeGateway')
      const gwUrl = gatewayUrl()
      if (gwUrl) {
        return await openAiStyle(gwUrl, '', gatewayModel(), toMsgs(input), opts)
      }
    } catch {
      /* gateway not available — continue to cloud fallbacks */
    }
    // Try other configured providers.
    const fallbacks = availableFallbacks(p)
    for (const fp of fallbacks) {
      try {
        return await callOneProvider(input, opts, fp)
      } catch {
        // Keep trying other providers.
        continue
      }
    }
    // All providers failed — re-throw the original error.
    throw err
  }
}

/** Try a single provider. Extracted so callProvider can retry with different providers. */
async function callOneProvider(
  input: string | ChatMessage[],
  opts: AiOptions,
  p: ProviderId,
): Promise<string> {
  // Server mode: the Laravel server holds the keys and picks the model.
  if (p === 'server') {
    return serverCall('/ai/text', { messages: toMsgs(input), model: opts.model }, opts)
  }

  const msgs = toMsgs(input)
  if (p === 'claude') {
    const rt = claudeRuntime()
    if (!rt) throw new AiError('not_ready', 'Claude is not available on this page.')
    const flat = msgs.map((m) => `${m.role}: ${m.content}`).join('\n\n')
    const out = await rt.use('sample').sample(flat, opts.onText ? { onText: opts.onText } : undefined)
    return typeof out === 'string' ? out : ''
  }

  if (p === 'puter') {
    return puterCall(msgs, opts)
  }

  const st = keyState()
  const model = opts.model || st.models[p] || PROVIDERS[p].model || ''
  if (p === 'gemini') return geminiCall(baseFor(p), keyFor(p), model, msgs, opts)
  if (p === 'anthropic') return anthropicCall(baseFor(p), keyFor(p), model, msgs, opts)
  return openAiStyle(baseFor(p), keyFor(p), model, msgs, opts, extraHeaders(p))
}

/** List providers that are configured and usable, excluding the primary. */
function availableFallbacks(primary: ProviderId): ProviderId[] {
  const st = keyState()
  const order: ProviderId[] = ['groq', 'gemini', 'openrouter', 'puter', 'mistral', 'xai', 'fireworks', 'openai', 'anthropic', 'custom', 'server']
  return order.filter((p) => {
    if (p === primary) return false
    if (p === 'server') return serverConfigured()
    if (p === 'puter') return !!st.puterOk
    if (p === 'claude') return !!claudeRuntime()
    if (PROVIDERS[p].needsKey) return !!keyFor(p)
    // custom works with no key (local Ollama etc.)
    return p === 'custom'
  })
}

/* --------------------------- Puter SDK ----------------------------- */

let puterLoading: Promise<boolean> | null = null

/** Dynamically load the Puter SDK. Returns true when available. */
export function loadPuterSDK(): Promise<boolean> {
  if (puterLoading) return puterLoading
  puterLoading = new Promise<boolean>((resolve) => {
    // Already loaded?
    const w = window as unknown as { puter?: any }
    if (w.puter?.ai?.chat) {
      const st = keyState()
      if (!st.puterOk) saveKeys({ ...st, puterOk: true })
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.puter.com/v2/'
    script.async = true
    script.onload = () => {
      const pw = window as unknown as { puter?: any }
      if (pw.puter?.ai?.chat) {
        const st = keyState()
        if (!st.puterOk) saveKeys({ ...st, puterOk: true })
        resolve(true)
      } else {
        resolve(false)
      }
    }
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
  return puterLoading
}

/** Call Puter's free AI. No key required — the SDK handles auth. */
async function puterCall(msgs: ChatMessage[], opts: AiOptions): Promise<string> {
  const w = window as unknown as { puter?: any }
  if (!w.puter?.ai?.chat) {
    // Try loading on the fly.
    const ok = await loadPuterSDK()
    if (!ok) throw new AiError('not_ready', 'Puter SDK could not load. Check your internet connection.')
  }
  const puter = (window as unknown as { puter: any }).puter
  const prompt = msgs.map((m) => `${m.role}: ${m.content}`).join('\n\n')
  try {
    const resp = await puter.ai.chat(prompt, { stream: !!opts.onText })
    if (opts.onText && typeof resp !== 'string') {
      // Streaming response — collect chunks.
      let full = ''
      for await (const chunk of resp) {
        const delta = chunk?.text ?? chunk?.content ?? ''
        if (delta) {
          full += delta
          opts.onText(delta, full)
        }
      }
      return full
    }
    // Non-streaming — resp may be a string or an object with .message.
    const text = typeof resp === 'string' ? resp : (resp?.message ?? resp?.text ?? '')
    opts.onText?.(text, text)
    return text
  } catch (e) {
    throw new AiError('provider_down', `Puter request failed: ${(e as Error).message}`)
  }
}

/** Ask for JSON through the Claude runtime's native json helper. */
export function claudeJson(prompt: string): Promise<unknown> | null {
  const rt = claudeRuntime()
  if (!rt) return null
  return rt.use('sample').json(prompt)
}

export { aiReady, aiWhy, serverConfigured, serverUrl, setServerUrl, httpErr }
