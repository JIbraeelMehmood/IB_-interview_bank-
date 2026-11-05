/**
 * GET  /api/v1/ai-keys  — fetch this user's stored AI provider keys
 * POST /api/v1/ai-keys  — save/update AI provider keys for this user
 *
 * Keys are stored encrypted-at-rest in MongoDB Atlas (Atlas Encryption at
 * Rest) and only returned to the authenticated owner. They never appear in
 * logs or error responses.
 *
 * Body (POST): { keys, models, base, prov, mt }
 *   Same shape as the client-side KeyState (src/lib/ai.ts).
 *   API key values may be empty strings — we store whatever the client sends.
 */
import { currentUser, getAiKeys, saveAiKeys, type ApiRequest, type ApiResponse } from '../../server/auth.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await currentUser(req)
  if (!user) return res.status(401).json({ error: 'Not signed in.' })

  if (req.method === 'GET') {
    try {
      const record = await getAiKeys(user.id)
      if (!record) return res.status(200).json({ keys: {}, models: {}, base: {}, prov: 'server', mt: 'auto' })
      // Never re-expose raw keys in full — return them so the client can
      // restore its state, but strip any value longer than a key (defensive).
      return res.status(200).json({
        keys: record.keys || {},
        models: record.models || {},
        base: record.base || {},
        prov: record.prov || 'server',
        mt: record.mt || 'auto',
      })
    } catch (err) {
      console.error('ai-keys GET failed', err)
      return res.status(500).json({ error: 'Could not load AI settings.' })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as Record<string, unknown> || {}
      const keys = (typeof body.keys === 'object' && body.keys !== null) ? body.keys as Record<string, string> : {}
      const models = (typeof body.models === 'object' && body.models !== null) ? body.models as Record<string, string> : {}
      const base = (typeof body.base === 'object' && body.base !== null) ? body.base as Record<string, string> : {}
      const prov = typeof body.prov === 'string' ? body.prov : 'server'
      const mt = typeof body.mt === 'string' ? body.mt : 'auto'

      // Validate: reject obviously oversized payloads (not API keys).
      const json = JSON.stringify({ keys, models, base, prov, mt })
      if (json.length > 16_000) return res.status(400).json({ error: 'Payload too large.' })

      await saveAiKeys(user.id, { keys, models, base, prov, mt })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('ai-keys POST failed', err)
      return res.status(500).json({ error: 'Could not save AI settings.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
