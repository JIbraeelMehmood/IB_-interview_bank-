/**
 * Free AI Gateway Integration
 *
 * Bridges Interview Box to the local AI gateways documented in
 * docs/OAUTH_ANALYSIS.md. When a local gateway is running, all AI calls
 * route through it — giving auto-failover across 20+ free providers.
 *
 * Supported gateways (user runs one locally):
 *   freellmpool — `pip install freellmpool && freellmpool serve`
 *                  → http://localhost:8000/v1  (178 routes, 23 providers, keyless start)
 *   free-ai-gateway — `npm run dev` in free-ai-gateway/
 *                  → http://localhost:3000/v1  (20 providers, circuit breaker, MCP)
 *
 * When neither is running the app falls back to the configured cloud provider.
 * The gateway is OpenAI-compatible so no changes to callProvider() are needed —
 * we just set base URL and use model:"auto".
 *
 * Usage:
 *   import { detectGateway, gatewayReady, gatewayUrl } from './freeGateway'
 *   await detectGateway()   // call once at app start
 *   if (gatewayReady()) { ... }
 */

const GATEWAYS = [
  { name: 'freellmpool', url: 'http://localhost:8000', model: 'auto' },
  { name: 'free-ai-gateway', url: 'http://localhost:3000', model: 'auto' },
] as const

const LS_KEY = 'ibx-free-gateway'

export interface GatewayInfo {
  name: string
  url: string
  model: string
  detectedAt: number
}

let _gateway: GatewayInfo | null = null

/** Read the last-detected gateway from localStorage (persists across loads). */
function loadCached(): GatewayInfo | null {
  try {
    const v = localStorage.getItem(LS_KEY)
    return v ? (JSON.parse(v) as GatewayInfo) : null
  } catch {
    return null
  }
}

function saveCache(g: GatewayInfo | null) {
  try {
    if (g) localStorage.setItem(LS_KEY, JSON.stringify(g))
    else localStorage.removeItem(LS_KEY)
  } catch {
    /* storage full */
  }
}

/**
 * Probe all known local gateway ports.
 * Sets the active gateway on first responding one.
 * Safe to call repeatedly — re-checks liveness.
 */
export async function detectGateway(timeoutMs = 1500): Promise<GatewayInfo | null> {
  // Quick check: if cached gateway still alive, use it
  const cached = _gateway ?? loadCached()
  if (cached) {
    const alive = await probe(cached.url, timeoutMs)
    if (alive) {
      _gateway = { ...cached, detectedAt: Date.now() }
      saveCache(_gateway)
      return _gateway
    }
  }

  // Try all known ports
  for (const g of GATEWAYS) {
    const alive = await probe(g.url, timeoutMs)
    if (alive) {
      _gateway = { ...g, detectedAt: Date.now() }
      saveCache(_gateway)
      return _gateway
    }
  }

  _gateway = null
  saveCache(null)
  return null
}

async function probe(baseUrl: string, timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    // Most OpenAI-compatible gateways expose GET /v1/models
    const res = await fetch(`${baseUrl}/v1/models`, { signal: ctrl.signal })
    clearTimeout(t)
    return res.status < 500
  } catch {
    return false
  }
}

/** Is a local free AI gateway currently available? */
export function gatewayReady(): boolean {
  return _gateway !== null
}

/** The active gateway info, or null. */
export function activeGateway(): GatewayInfo | null {
  return _gateway ?? loadCached()
}

/** The base URL for the active gateway, or null. */
export function gatewayUrl(): string | null {
  const g = _gateway ?? loadCached()
  return g ? `${g.url}/v1` : null
}

/** The recommended model string for the active gateway ("auto" for smart routing). */
export function gatewayModel(): string {
  const g = _gateway ?? loadCached()
  return g?.model ?? 'auto'
}

/** Clear the detected gateway (e.g. on user sign-out or settings reset). */
export function clearGateway(): void {
  _gateway = null
  saveCache(null)
}

/**
 * React hook-style helper to be called from components:
 * Loads the cached value immediately, then re-probes.
 */
export async function initGateway(): Promise<void> {
  // Load from cache synchronously so UI can react before the async probe
  const cached = loadCached()
  if (cached) _gateway = cached

  // Async probe to verify/refresh
  await detectGateway()
}

/**
 * Gateway status line for display in UI.
 * Returns e.g. "freellmpool — 178 routes" or "No gateway".
 */
export function gatewayStatus(): string {
  const g = _gateway ?? loadCached()
  if (!g) return 'No local AI gateway detected'
  const extras: Record<string, string> = {
    'freellmpool': '178 routes, 23 providers',
    'free-ai-gateway': '20 providers, circuit breaker',
  }
  return `${g.name} — ${extras[g.name] || 'OpenAI-compatible'} at ${g.url}`
}
