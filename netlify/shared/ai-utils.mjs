// Shared helpers for the AI endpoints: origin check, best-effort rate limiting,
// input caps, the Groq call, and consistent JSON responses.
//
// NOTE on rate limiting: Netlify Functions are serverless, so this in-memory
// counter is per-instance and resets on cold start — it's a best-effort deterrent
// against casual abuse of the public endpoints, not a hard guarantee. For strict
// limits, back it with a shared store (Netlify Blobs / Upstash Redis).

const WINDOW_MS = 60_000      // 1 minute window
const MAX_REQUESTS = 30       // per client IP per window, across all AI actions
const MAX_INPUT = 8000        // hard cap on input chars sent to the model

const hits = new Map()        // ip -> { count, resetAt }

function clientIp(event) {
  const h = event.headers || {}
  return (
    h['x-nf-client-connection-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  )
}

function rateLimit(ip) {
  const now = Date.now()
  // Opportunistically prune expired entries so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
  }
  const rec = hits.get(ip)
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }
  if (rec.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) }
  }
  rec.count++
  return { ok: true }
}

// Hosts allowed to call these endpoints from a browser.
const ALLOWED_HOSTS = ['storyforge26.netlify.app', 'localhost', '127.0.0.1']

function hostAllowed(value) {
  if (!value) return null // header absent -> caller unknown
  try {
    const { hostname } = new URL(value)
    if (ALLOWED_HOSTS.includes(hostname)) return true
    if (hostname.endsWith('--storyforge26.netlify.app')) return true // deploy previews / branch deploys
    return false
  } catch {
    return false
  }
}

// Blocks cross-site browser calls. A request with no Origin/Referer (e.g. a
// same-origin POST that omitted them, or a non-browser client) is allowed
// through to the rate limiter — header checks can't stop a determined caller,
// they just keep other sites' pages from using our quota.
function originAllowed(event) {
  const h = event.headers || {}
  const byOrigin = hostAllowed(h.origin)
  if (byOrigin !== null) return byOrigin
  const byReferer = hostAllowed(h.referer)
  if (byReferer !== null) return byReferer
  return true
}

async function askGroq(prompt, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Groq error')
  return data.choices[0].message.content
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  }
}

/**
 * Builds a Netlify handler for an AI endpoint with shared gating:
 * POST-only, origin check, rate limit, body parse, input cap, error handling.
 *
 * @param {object}   opts
 * @param {(args: {text: string, genre?: string}) => string} opts.buildPrompt
 * @param {number}   opts.maxTokens
 */
export function makeAiHandler({ buildPrompt, maxTokens }) {
  return async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!originAllowed(event)) return json(403, { error: 'Forbidden' })

    const rl = rateLimit(clientIp(event))
    if (!rl.ok) {
      return json(429, { error: 'Too many requests — please slow down and try again shortly.' }, { 'Retry-After': String(rl.retryAfter) })
    }

    try {
      const { text, genre } = JSON.parse(event.body || '{}')
      if (!text || !String(text).trim()) return json(400, { error: 'No text provided' })

      const clipped = String(text).slice(0, MAX_INPUT)
      const result = await askGroq(buildPrompt({ text: clipped, genre }), maxTokens)
      return json(200, { result })
    } catch (err) {
      return json(500, { error: err.message })
    }
  }
}
