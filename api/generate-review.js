import { fetchSalesPage, isTrackerUrl } from './_research.js'
import { buildMessages, buildRoundupMessages, MIN_WORDS } from './_prompt.js'
import { buildCandidates, formatCandidates } from './_roundup.js'
import { sb, SUPABASE_URL, SUPABASE_ANON } from './_supabase.js'

export const config = { runtime: 'edge' }

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

/**
 * DeepSeek retired `deepseek-chat` and `deepseek-reasoner` on 2026-07-24 —
 * those names now fail outright rather than falling back. Overridable by env
 * so the next rename does not need a code change.
 */
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

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

  if (body.mode === 'roundup') return handleRoundup(body, apiKey)

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

  return streamCompletion(
    apiKey,
    buildMessages({ productName, affiliateUrl, notes, categoryName, research }),
    {
      // Surfaced in the UI so a silent scrape failure is never mistaken for
      // a well-researched article.
      'x-research-ok': research.ok ? '1' : '0',
      'x-research-note': encodeURIComponent(
        research.ok
          ? `Read sales page: ${research.finalUrl}`
          : `Sales page not read — ${research.error}`
      ),
    }
  )
}

async function streamCompletion(apiKey, messages, extraHeaders = {}) {
  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      // Thinking mode defaults to enabled on v4. Long-form writing gains
      // nothing from it and pays for the reasoning tokens plus the latency,
      // so it is switched off deliberately rather than left to the default.
      thinking: { type: 'disabled' },
      temperature: 1.0,
      max_tokens: 8192,
      messages,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')

    // Surface DeepSeek's own wording: its 400s and 402s name the actual
    // problem (bad parameter, empty balance, unknown model) and guessing from
    // the status code alone wastes a round trip.
    let message = detail
    try {
      const parsed = JSON.parse(detail)
      message = parsed?.error?.message || parsed?.message || detail
    } catch {
      /* not JSON — the raw body is still the best clue */
    }

    return json(
      {
        error: `DeepSeek rejected the request (HTTP ${upstream.status}): ${
          message || '(empty response body)'
        }`,
        status: upstream.status,
      },
      502
    )
  }

  return new Response(toTextStream(upstream.body), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-min-words': String(MIN_WORDS),
      ...extraHeaders,
    },
  })
}

/**
 * Ranks products the site has already reviewed.
 *
 * The facts come from those reviews rather than from the model, and each entry
 * links back to its full review, so a roundup strengthens the pages it draws
 * from instead of competing with them.
 */
async function handleRoundup(body, apiKey) {
  const categoryId = String(body.categoryId || '').trim()
  const categoryName = String(body.categoryName || '').trim()
  const count = Math.min(10, Math.max(3, Number(body.count) || 7))
  const year = String(body.year || '').trim() || String(new Date().getUTCFullYear())

  if (!categoryId) return json({ error: 'Pick a category to round up.' }, 400)

  // Over-fetch: reviews without an outbound link cannot fill a slot.
  const posts = await sb(
    `posts?published=eq.true&category_id=eq.${encodeURIComponent(categoryId)}` +
      `&select=title,slug,excerpt,content,view_count&order=view_count.desc&limit=${count * 3}`
  )

  const candidates = buildCandidates(posts || [], count)
  if (candidates.length < 3) {
    return json(
      {
        error: `Only ${candidates.length} review(s) in this category have an affiliate link. A roundup needs at least 3.`,
      },
      400
    )
  }

  return streamCompletion(
    apiKey,
    buildRoundupMessages({
      categoryName,
      year,
      candidates: formatCandidates(candidates),
      notes: String(body.notes || ''),
    }),
    {
      'x-research-ok': '1',
      'x-research-note': encodeURIComponent(
        `Built from ${candidates.length} of your published reviews: ${candidates
          .map((c) => c.productName)
          .join(', ')}`
      ),
    }
  )
}
