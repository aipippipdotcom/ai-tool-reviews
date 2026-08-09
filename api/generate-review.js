import { fetchSalesPage, isTrackerUrl } from './_research.js'
import { buildMessages, MIN_WORDS } from './_prompt.js'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/**
 * Only signed-in admins may spend API credits.
 *
 * The check runs here rather than in the client because the admin page is
 * ordinary public JavaScript — anyone can call this endpoint directly.
 */
async function requireAdmin(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return { ok: false, status: 401, error: 'Sign in first.' }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return { ok: false, status: 401, error: 'Session expired — sign in again.' }

  const user = await userRes.json()
  if (!user?.id) return { ok: false, status: 401, error: 'Session expired — sign in again.' }

  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_role`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ _user_id: user.id, _role: 'admin' }),
  })
  const isAdmin = roleRes.ok && (await roleRes.json()) === true
  if (!isAdmin) return { ok: false, status: 403, error: 'Admins only.' }

  return { ok: true, user }
}

/**
 * DeepSeek speaks OpenAI-compatible SSE. Unwrap it to a plain text stream so
 * the client can append tokens without parsing events.
 *
 * Streaming is not a nicety here: a 2000-word article takes well over a minute,
 * which would exceed the function's response deadline as a single reply.
 */
function toTextStream(upstream, { onText, onDone } = {}) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const payload = trimmed.slice(5).trim()
            if (payload === '[DONE]') continue

            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content
              if (delta) {
                onText?.(delta)
                controller.enqueue(encoder.encode(delta))
              }
            } catch {
              // A partial JSON frame — the next chunk completes it.
            }
          }
        }
        onDone?.()
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[stream error: ${err?.message || 'unknown'}]`))
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'POST only.' }, 405)

  // Authorise before touching configuration: reporting whether a key exists is
  // information a stranger has no business learning.
  const gate = await requireAdmin(request)
  if (!gate.ok) return json({ error: gate.error }, gate.status)

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return json({ error: 'DEEPSEEK_API_KEY is not set on the server.' }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Malformed request.' }, 400)
  }

  const productName = String(body.productName || '').trim()
  const affiliateUrl = String(body.affiliateUrl || '').trim()
  const salesPageUrl = String(body.salesPageUrl || '').trim()
  const notes = String(body.notes || '')
  const categoryName = String(body.categoryName || '')

  if (!productName) return json({ error: 'Product name is required.' }, 400)
  if (!affiliateUrl) return json({ error: 'Affiliate URL is required.' }, 400)

  // The affiliate link is what readers click; it is usually a tracking
  // interstitial with nothing to read. The sales page is what we learn from.
  const researchUrl = salesPageUrl || affiliateUrl
  const research = await fetchSalesPage(researchUrl)
  research.usedTracker = !salesPageUrl && isTrackerUrl(affiliateUrl)

  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 1.0,
      max_tokens: 8192,
      messages: buildMessages({ productName, affiliateUrl, notes, categoryName, research }),
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    return json(
      { error: `DeepSeek returned ${upstream.status}. ${detail.slice(0, 300)}` },
      502
    )
  }

  return new Response(toTextStream(upstream.body), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // Surfaced in the UI so a silent scrape failure is never mistaken for
      // a well-researched article.
      'x-research-ok': research.ok ? '1' : '0',
      'x-research-note': encodeURIComponent(
        research.ok
          ? `Read sales page: ${research.finalUrl}`
          : `Sales page not read — ${research.error}`
      ),
      'x-min-words': String(MIN_WORDS),
    },
  })
}
