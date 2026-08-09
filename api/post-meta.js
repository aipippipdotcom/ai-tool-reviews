import { indexHtml } from './index-html.js'
import { tokenize } from './_shortcodes.js'
import { esc, renderPostBody, renderNotFoundBody } from './_render.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'

const BASE_URL = 'https://aipippip.net'
const SITE_NAME = 'AIPipPip'
const DEFAULT_TITLE = 'AIPipPip — Best AI Tools Reviews & Comparisons'
const DEFAULT_DESC =
  'Discover and compare the best AI tools. In-depth reviews, tutorials, and the latest updates on artificial intelligence tools.'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

const PUBLISHER = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: BASE_URL,
  logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.png` },
}
const AUTHOR = { '@type': 'Person', name: SITE_NAME, url: `${BASE_URL}/about` }

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

const getPost = (slug) =>
  sb(
    `posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1` +
      `&select=id,title,content,meta_title,meta_description,excerpt,cover_image,slug,created_at,updated_at,category_id`
  ).then((d) => d?.[0] || null)

const getCategoryById = (id) =>
  sb(`categories?id=eq.${encodeURIComponent(id)}&select=name,slug,icon&limit=1`).then(
    (d) => d?.[0] || null
  )

const getCategoryBySlug = (slug) =>
  sb(`categories?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,description&limit=1`).then(
    (d) => d?.[0] || null
  )

/** "$9.95" / "€19" / "29 USD" → { price, currency } */
function parsePrice(raw) {
  if (!raw) return null
  const num = String(raw).match(/[\d]+(?:[.,]\d+)?/)
  if (!num) return null
  const symbols = { $: 'USD', '€': 'EUR', '£': 'GBP', '₫': 'VND' }
  const symbol = Object.keys(symbols).find((s) => String(raw).includes(s))
  const code = String(raw).match(/\b(USD|EUR|GBP|VND|AUD|CAD)\b/i)
  return {
    price: num[0].replace(',', '.'),
    currency: code ? code[1].toUpperCase() : symbol ? symbols[symbol] : 'USD',
  }
}

/** Pulls the review verdict out of the content so it can drive Review schema. */
function extractVerdict(content) {
  for (const t of tokenize(content || '')) {
    if (t.type === 'verdict') {
      const rating = Number(t.attrs.rating)
      return {
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        title: t.attrs.title || '',
        url: t.attrs.url || '',
        price: parsePrice(t.attrs.price),
      }
    }
  }
  return null
}

function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

/**
 * data-rh="true" is react-helmet-async's ownership marker: on mount it deletes
 * every tag carrying it and re-emits its own. That is what keeps these tags
 * from stacking up as duplicates once the SPA boots — src/components/Seo.tsx
 * emits this exact same set, so the two must stay in lockstep.
 */
function injectHead(html, meta) {
  const rh = 'data-rh="true"'
  const head = `
    <title ${rh}>${esc(meta.title)}</title>
    <meta ${rh} name="description" content="${esc(meta.description)}"/>
    <meta ${rh} name="robots" content="${meta.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}"/>
    <link ${rh} rel="canonical" href="${esc(meta.url)}"/>
    <meta ${rh} property="og:title" content="${esc(meta.title)}"/>
    <meta ${rh} property="og:description" content="${esc(meta.description)}"/>
    <meta ${rh} property="og:type" content="${esc(meta.type)}"/>
    <meta ${rh} property="og:url" content="${esc(meta.url)}"/>
    <meta ${rh} property="og:image" content="${esc(meta.image)}"/>
    <meta ${rh} property="og:image:width" content="1200"/>
    <meta ${rh} property="og:image:height" content="630"/>
    <meta ${rh} property="og:site_name" content="${SITE_NAME}"/>
    <meta ${rh} name="twitter:card" content="summary_large_image"/>
    <meta ${rh} name="twitter:title" content="${esc(meta.title)}"/>
    <meta ${rh} name="twitter:description" content="${esc(meta.description)}"/>
    <meta ${rh} name="twitter:image" content="${esc(meta.image)}"/>
    ${meta.schema ? `<script ${rh} type="application/ld+json">${meta.schema}</script>` : ''}
  `
  return html.replace(/<title>.*?<\/title>/s, '').replace('<head>', `<head>${head}`)
}

function injectBody(html, body) {
  if (!body) return html
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

async function resolve(urlPath) {
  const postMatch = urlPath.match(/^\/post\/([^/]+)\/?$/)
  if (postMatch) {
    const post = await getPost(decodeURIComponent(postMatch[1]))
    if (!post) return null

    const category = post.category_id ? await getCategoryById(post.category_id) : null
    const title = `${post.meta_title || post.title} — ${SITE_NAME}`
    const description = post.meta_description || post.excerpt || DEFAULT_DESC
    const image = post.cover_image || DEFAULT_IMAGE
    const url = `${BASE_URL}/post/${post.slug}`
    const verdict = extractVerdict(post.content)

    const article = {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: post.title,
      description,
      url,
      image,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      author: AUTHOR,
      publisher: PUBLISHER,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    }

    const graph = [article]

    // Only claim a Review when the article actually states a rating — a fake
    // one is a manual-action risk, not just an invalid snippet.
    if (verdict?.rating && verdict.title) {
      graph.push({
        '@type': 'Review',
        '@id': `${url}#review`,
        url,
        name: post.title,
        datePublished: post.created_at,
        author: AUTHOR,
        publisher: PUBLISHER,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: verdict.rating,
          bestRating: 5,
          worstRating: 1,
        },
        itemReviewed: {
          '@type': 'Product',
          name: verdict.title,
          image,
          ...(verdict.price || verdict.url
            ? {
                offers: {
                  '@type': 'Offer',
                  ...(verdict.price
                    ? { price: verdict.price.price, priceCurrency: verdict.price.currency }
                    : {}),
                  ...(verdict.url ? { url: verdict.url } : {}),
                  availability: 'https://schema.org/InStock',
                },
              }
            : {}),
        },
      })
    }

    graph.push(
      breadcrumb([
        { name: 'Home', url: BASE_URL },
        ...(category
          ? [{ name: category.name, url: `${BASE_URL}/category/${category.slug}` }]
          : []),
        { name: post.title, url },
      ])
    )

    return {
      meta: {
        title,
        description,
        image,
        url,
        type: 'article',
        schema: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      },
      body: renderPostBody(post, category),
      // Seeds React Query so the SPA paints the article on its first render.
      // Without it React would wipe the injected HTML and flash a skeleton
      // while it re-fetched a post we have already loaded here.
      preload: { post: { ...post, categories: category } },
    }
  }

  const catMatch = urlPath.match(/^\/category\/([^/]+)\/?$/)
  if (catMatch) {
    const slug = decodeURIComponent(catMatch[1])
    const cat = await getCategoryBySlug(slug)
    if (!cat) return null

    const url = `${BASE_URL}/category/${cat.slug}`
    const description =
      cat.description ||
      `Browse every ${cat.name} review on ${SITE_NAME} — hands-on testing, pricing breakdowns and honest verdicts.`

    return {
      meta: {
        title: `${cat.name} — Reviews & Comparisons | ${SITE_NAME}`,
        description,
        image: DEFAULT_IMAGE,
        url,
        type: 'website',
        schema: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              url,
              name: cat.name,
              description,
              publisher: PUBLISHER,
            },
            breadcrumb([
              { name: 'Home', url: BASE_URL },
              { name: cat.name, url },
            ]),
          ],
        }),
      },
      // Body injection is post-pages only for now: seeding the list queries
      // needs the pagination refactor first, and injecting HTML the SPA then
      // wipes would flash blank.
      body: null,
    }
  }

  if (urlPath === '/' || urlPath === '') {
    return {
      meta: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: BASE_URL,
        type: 'website',
        schema: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', url: BASE_URL, name: SITE_NAME, publisher: PUBLISHER },
            PUBLISHER,
          ],
        }),
      },
      body: null,
    }
  }

  if (urlPath.startsWith('/categories')) {
    const url = `${BASE_URL}/categories`
    const description = `Every AI tool category we review on ${SITE_NAME} — writing, video, design, marketing, voice and more.`
    return {
      meta: {
        title: `All Categories — ${SITE_NAME}`,
        description,
        image: DEFAULT_IMAGE,
        url,
        type: 'website',
        schema: JSON.stringify({
          '@context': 'https://schema.org',
          ...breadcrumb([
            { name: 'Home', url: BASE_URL },
            { name: 'Categories', url },
          ]),
        }),
      },
      body: null,
    }
  }

  if (urlPath.startsWith('/about')) {
    const url = `${BASE_URL}/about`
    const description =
      'Learn about AIPipPip — your go-to source for honest AI tool reviews and comparisons.'
    return {
      meta: {
        title: `About Us — ${SITE_NAME}`,
        description,
        image: DEFAULT_IMAGE,
        url,
        type: 'website',
        schema: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'AboutPage', url, description, publisher: PUBLISHER },
            breadcrumb([
              { name: 'Home', url: BASE_URL },
              { name: 'About', url },
            ]),
          ],
        }),
      },
      body: null,
    }
  }

  return null
}

/**
 * vercel.json passes the original path as ?path= because a legacy `routes`
 * rewrite replaces req.url with the destination. Fall back to req.url so the
 * function still works when hit directly.
 */
function requestPath(req) {
  const [rawPath, rawQuery] = String(req.url || '/').split('?')
  const fromQuery = new URLSearchParams(rawQuery || '').get('path')
  const path = fromQuery || rawPath || '/'
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path
}

export default async function handler(req, res) {
  const urlPath = requestPath(req)
  let resolved

  try {
    resolved = await resolve(urlPath)
  } catch {
    resolved = null
  }

  // Unknown slug → a real 404. Previously this fell through to default meta
  // with index,follow, which let Google index unlimited junk URLs.
  if (!resolved) {
    const html = injectBody(
      injectHead(indexHtml, {
        title: `Page Not Found — ${SITE_NAME}`,
        description: 'The page you are looking for does not exist.',
        image: DEFAULT_IMAGE,
        url: `${BASE_URL}${urlPath}`,
        type: 'website',
        schema: '',
        noindex: true,
      }),
      renderNotFoundBody()
    )
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    return res.status(404).send(html)
  }

  let html = injectHead(indexHtml, resolved.meta)
  html = injectBody(html, resolved.body)

  if (resolved.preload) {
    html = html.replace(
      '</head>',
      `<script>window.__PRELOAD__=${JSON.stringify(resolved.preload).replace(/</g, '\\u003c')}</script></head>`
    )
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).send(html)
}
