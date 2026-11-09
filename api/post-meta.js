import { indexHtml } from './index-html.js'
import { tokenize } from './_shortcodes.js'
import { sb } from './_supabase.js'
import { pickNeighbours, RELATED_COUNT } from './_related.js'
import {
  esc,
  categoryLabel,
  renderPostBody,
  renderHomeBody,
  renderCategoryBody,
  renderNotFoundBody,
} from './_render.js'

/** Must match POSTS_PER_CATEGORY in src/components/CategorySection.tsx. */
const POSTS_PER_CATEGORY = 6
/** Must match PAGE_SIZE in src/pages/CategoryPage.tsx. */
const CATEGORY_PAGE_SIZE = 12

const listSelect = 'id,title,slug,excerpt,cover_image,created_at'

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

const getCategories = () =>
  sb('categories?select=id,name,slug,icon,description,sort_order&order=sort_order').then(
    (d) => d || []
  )

const getCategoryPosts = (categoryId, limit, offset = 0) =>
  sb(
    `posts?published=eq.true&category_id=eq.${encodeURIComponent(categoryId)}` +
      `&select=${listSelect}&order=created_at.desc&limit=${limit}&offset=${offset}`
  ).then((d) => d || [])

const countCategoryPosts = (categoryId) =>
  sb(`posts?published=eq.true&category_id=eq.${encodeURIComponent(categoryId)}&select=id`).then(
    (d) => (d || []).length
  )

/** The post's neighbours by date in its category. See api/_related.js. */
async function getRelated(post) {
  if (!post.category_id) return []
  const base =
    `posts?published=eq.true&category_id=eq.${encodeURIComponent(post.category_id)}` +
    `&id=neq.${encodeURIComponent(post.id)}&select=${listSelect}&limit=${RELATED_COUNT}`
  const at = encodeURIComponent(post.created_at)
  const [newer, older] = await Promise.all([
    sb(`${base}&created_at=gt.${at}&order=created_at.asc`),
    sb(`${base}&created_at=lt.${at}&order=created_at.desc`),
  ])
  return pickNeighbours(newer || [], older || [])
}

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
    <meta ${rh} property="og:image" content="${esc(meta.image)}"/>${
      // Only the site's own card has known dimensions. Declaring 1200x630 for a
      // cover of some other shape makes the scraper crop to a frame the image
      // does not fill.
      meta.image === DEFAULT_IMAGE
        ? `
    <meta ${rh} property="og:image:width" content="1200"/>
    <meta ${rh} property="og:image:height" content="630"/>`
        : ''
    }
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

    const [category, related] = await Promise.all([
      post.category_id ? getCategoryById(post.category_id) : null,
      getRelated(post),
    ])
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
          ? [{ name: categoryLabel(category.name), url: `${BASE_URL}/category/${category.slug}` }]
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
      body: renderPostBody(post, category, related),
      // Seeds React Query so the SPA paints the article on its first render.
      // Without it React would wipe the injected HTML and flash a skeleton
      // while it re-fetched a post we have already loaded here.
      preload: { post: { ...post, categories: category }, related },
    }
  }

  // Page 1 is /category/:slug; later pages are /category/:slug/page/:n. They
  // are real, linked URLs rather than a "Load more" button, because a crawler
  // never clicks: with the button, only the first 12 posts of each category
  // were reachable, and most of the site was linked from nowhere.
  const catMatch = urlPath.match(/^\/category\/([^/]+)(?:\/page\/(\d+))?\/?$/)
  if (catMatch) {
    const slug = decodeURIComponent(catMatch[1])
    const page = catMatch[2] ? Number(catMatch[2]) : 1
    const cat = await getCategoryBySlug(slug)
    if (!cat) return null

    const baseUrl = `${BASE_URL}/category/${cat.slug}`
    // /page/1 duplicates the bare URL; send it there rather than serve it twice.
    if (catMatch[2] && page <= 1) return { redirect: `/category/${cat.slug}` }

    const [posts, total] = await Promise.all([
      getCategoryPosts(cat.id, CATEGORY_PAGE_SIZE, (page - 1) * CATEGORY_PAGE_SIZE),
      countCategoryPosts(cat.id),
    ])
    const totalPages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE))
    if (page > totalPages) return null

    const url = page > 1 ? `${baseUrl}/page/${page}` : baseUrl
    const pageSuffix = page > 1 ? ` — Page ${page} of ${totalPages}` : ''
    const baseDescription =
      cat.description ||
      `Browse every ${categoryLabel(cat.name)} review on ${SITE_NAME} — hands-on testing, pricing breakdowns and honest verdicts.`
    // Distinct per page, so Search Console does not flag duplicate descriptions.
    const description = page > 1 ? `Page ${page} of ${totalPages}. ${baseDescription}` : baseDescription

    return {
      meta: {
        title: `${categoryLabel(cat.name)} — Reviews & Comparisons${pageSuffix} | ${SITE_NAME}`,
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
              name: categoryLabel(cat.name),
              description,
              publisher: PUBLISHER,
            },
            breadcrumb([
              { name: 'Home', url: BASE_URL },
              { name: categoryLabel(cat.name), url: baseUrl },
              ...(page > 1 ? [{ name: `Page ${page}`, url }] : []),
            ]),
          ],
        }),
      },
      body: renderCategoryBody(cat, baseDescription, posts, page, totalPages),
      // Keys must match the useQuery calls in src/pages/CategoryPage.tsx, or
      // React refetches and flashes an empty grid over the rendered one.
      preload: {
        category: cat,
        categoryPosts: posts,
        categoryPage: page,
        categoryTotal: total,
        categoryPageSize: CATEGORY_PAGE_SIZE,
      },
    }
  }

  if (urlPath === '/' || urlPath === '') {
    const categories = await getCategories()
    const sections = await Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        posts: await getCategoryPosts(cat.id, POSTS_PER_CATEGORY),
      }))
    )

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
      body: renderHomeBody(sections),
      // Keys must match src/pages/Index.tsx, or React discards this and
      // repaints an empty page over the rendered one.
      preload: {
        categories,
        homePosts: Object.fromEntries(sections.map((s) => [s.id, s.posts])),
        postsPerCategory: POSTS_PER_CATEGORY,
      },
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
  } catch (err) {
    // A thrown resolve() means a bug or an unreachable database, not a missing
    // page. Serving 404 for it made a site-wide outage look like ordinary
    // not-found traffic, with nothing in the logs. Fail loudly instead: 503
    // tells crawlers to come back rather than to drop the URL.
    console.error('resolve failed', urlPath, err)
    return res
      .status(503)
      .setHeader('content-type', 'text/plain; charset=utf-8')
      .setHeader('cache-control', 'no-store')
      .send(`Temporarily unavailable: ${err?.message || 'unknown error'}`)
  }

  if (resolved?.redirect) {
    res.setHeader('Location', resolved.redirect)
    res.setHeader('Cache-Control', 'public, s-maxage=86400')
    return res.status(301).send('')
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
