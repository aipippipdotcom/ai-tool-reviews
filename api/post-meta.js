import { indexHtml } from './index-html.js'

const SUPABASE_URL = 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'
const BASE_URL = 'https://aipippip.net'
const SITE_NAME = 'AIPipPip'
const DEFAULT_TITLE = 'AIPipPip — Best AI Tools Reviews & Comparisons'
const DEFAULT_DESC = 'Discover and compare the best AI tools. In-depth reviews, tutorials, and the latest updates on artificial intelligence tools.'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function injectMeta(html, { title, description, image, url, type, schema }) {
  const metaBlock = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}"/>
    <meta name="robots" content="index,follow"/>
    <link rel="canonical" href="${escapeHtml(url)}"/>
    <meta property="og:title" content="${escapeHtml(title)}"/>
    <meta property="og:description" content="${escapeHtml(description)}"/>
    <meta property="og:type" content="${type}"/>
    <meta property="og:url" content="${escapeHtml(url)}"/>
    <meta property="og:image" content="${escapeHtml(image)}"/>
    <meta property="og:site_name" content="${SITE_NAME}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${escapeHtml(title)}"/>
    <meta name="twitter:description" content="${escapeHtml(description)}"/>
    <meta name="twitter:image" content="${escapeHtml(image)}"/>
    ${schema ? `<script type="application/ld+json">${schema}</script>` : ''}
  `
  return html
    .replace(/<title>.*?<\/title>/s, '')
    .replace('<head>', `<head>${metaBlock}`)
}

async function getPost(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=title,meta_title,meta_description,excerpt,cover_image,slug,created_at,updated_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY } }
  )
  const data = await res.json()
  return data?.[0] || null
}

async function getCategory(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?slug=eq.${encodeURIComponent(slug)}&select=name,slug&limit=1`,
    { headers: { apikey: SUPABASE_KEY } }
  )
  const data = await res.json()
  return data?.[0] || null
}

export default async function handler(req, res) {
  const urlPath = req.url.split('?')[0]
  let meta = null

  // /post/:slug
  const postMatch = urlPath.match(/^\/post\/([^/]+)\/?$/)
  if (postMatch) {
    const post = await getPost(postMatch[1])
    if (post) {
      const title = `${post.meta_title || post.title} — ${SITE_NAME}`
      const description = post.meta_description || post.excerpt || DEFAULT_DESC
      const image = post.cover_image || DEFAULT_IMAGE
      const url = `${BASE_URL}/post/${post.slug}`
      meta = {
        title, description, image, url, type: 'article',
        schema: JSON.stringify({
          "@context": "https://schema.org", "@type": "Article",
          "headline": post.title, "description": description,
          "url": url, "image": image,
          "datePublished": post.created_at, "dateModified": post.updated_at,
          "author": { "@type": "Person", "name": SITE_NAME, "url": `${BASE_URL}/about` },
          "publisher": { "@type": "Organization", "name": SITE_NAME, "logo": { "@type": "ImageObject", "url": `${BASE_URL}/favicon.png` } }
        })
      }
    }
  }

  // /category/:slug
  const catMatch = urlPath.match(/^\/category\/([^/]+)\/?$/)
  if (!meta && catMatch) {
    const cat = await getCategory(catMatch[1])
    const name = cat?.name || catMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    meta = {
      title: `${name} — ${SITE_NAME}`,
      description: `Browse all ${name} articles. In-depth AI tool reviews, tutorials and comparisons.`,
      image: DEFAULT_IMAGE, url: `${BASE_URL}/category/${catMatch[1]}`,
      type: 'website', schema: ''
    }
  }

  // /about
  if (!meta && urlPath.startsWith('/about')) {
    meta = {
      title: `About Us — ${SITE_NAME}`,
      description: 'Learn about AIPipPip — your go-to source for honest AI tool reviews and comparisons.',
      image: DEFAULT_IMAGE, url: `${BASE_URL}/about`,
      type: 'website', schema: ''
    }
  }

  if (!meta) {
    meta = {
      title: DEFAULT_TITLE, description: DEFAULT_DESC,
      image: DEFAULT_IMAGE, url: BASE_URL,
      type: 'website', schema: ''
    }
  }

  const html = injectMeta(indexHtml, meta)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).send(html)
}
