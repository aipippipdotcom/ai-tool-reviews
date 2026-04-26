const SUPABASE_URL = 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'
const BASE_URL = 'https://aipippip.net'
const SITE_NAME = 'AIPipPip'
const DEFAULT_TITLE = 'AIPipPip — Review Công Cụ AI Tốt Nhất'
const DEFAULT_DESC = 'Khám phá và so sánh các công cụ AI tốt nhất. Review chi tiết, hướng dẫn sử dụng và cập nhật mới nhất.'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml({ title, description, image, url, type = 'website', schema = '' }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
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
<script>
  // Redirect browser sang SPA, giữ nguyên path
  if (typeof window !== 'undefined') {
    window.location.replace(window.location.href);
  }
</script>
<noscript>
  <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}"/>
</noscript>
</head>
<body>
<p>Đang chuyển hướng...</p>
</body>
</html>`
}

async function getPost(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=title,meta_title,meta_description,excerpt,cover_image,slug,created_at,updated_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' } }
  )
  const data = await res.json()
  return data?.[0] || null
}

async function getCategory(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?slug=eq.${encodeURIComponent(slug)}&select=name,slug&limit=1`,
    { headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' } }
  )
  const data = await res.json()
  return data?.[0] || null
}

export default async function handler(req, res) {
  const urlPath = req.url.split('?')[0]

  // --- /post/:slug ---
  const postMatch = urlPath.match(/^\/post\/([^/]+)\/?$/)
  if (postMatch) {
    const slug = postMatch[1]
    const post = await getPost(slug)
    if (post) {
      const title = `${post.meta_title || post.title} — ${SITE_NAME}`
      const description = post.meta_description || post.excerpt || DEFAULT_DESC
      const image = post.cover_image || DEFAULT_IMAGE
      const url = `${BASE_URL}/post/${post.slug}`
      const schema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": description,
        "url": url,
        "image": image,
        "datePublished": post.created_at,
        "dateModified": post.updated_at,
        "author": { "@type": "Person", "name": SITE_NAME, "url": `${BASE_URL}/about` },
        "publisher": { "@type": "Organization", "name": SITE_NAME, "logo": { "@type": "ImageObject", "url": `${BASE_URL}/favicon.png` } }
      })
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      return res.status(200).send(buildHtml({ title, description, image, url, type: 'article', schema }))
    }
  }

  // --- /category/:slug ---
  const catMatch = urlPath.match(/^\/category\/([^/]+)\/?$/)
  if (catMatch) {
    const slug = catMatch[1]
    const cat = await getCategory(slug)
    const name = cat?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(buildHtml({
      title: `${name} — ${SITE_NAME}`,
      description: `Tất cả bài viết về ${name}. Review và hướng dẫn sử dụng công cụ AI.`,
      image: DEFAULT_IMAGE,
      url: `${BASE_URL}/category/${slug}`,
      type: 'website'
    }))
  }

  // --- /about ---
  if (urlPath.startsWith('/about')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(buildHtml({
      title: `Về Chúng Tôi — ${SITE_NAME}`,
      description: 'Tìm hiểu về AIPipPip — trang review công cụ AI hàng đầu Việt Nam.',
      image: DEFAULT_IMAGE,
      url: `${BASE_URL}/about`,
      type: 'website'
    }))
  }

  // --- Trang chủ + tất cả còn lại → trả index.html gốc ---
  // Không xử lý ở đây, để vercel.json serve file tĩnh
  return res.status(404).send('Not handled')
}
