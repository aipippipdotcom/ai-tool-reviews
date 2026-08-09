export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'
const BASE_URL = 'https://aipippip.net'

const day = (iso) => (iso ? String(iso).split('T')[0] : null)

function url({ loc, lastmod, changefreq, priority }) {
  return `
  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export default async function handler() {
  const [postsRes, catsRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=slug,updated_at,category_id&published=eq.true&order=updated_at.desc`,
      { headers: { apikey: SUPABASE_KEY } }
    ),
    fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,slug`, {
      headers: { apikey: SUPABASE_KEY },
    }),
  ])

  const posts = (await postsRes.json()) || []
  const categories = (await catsRes.json()) || []

  // Newest post date doubles as lastmod for the pages that list posts, so
  // Google re-crawls the hubs when anything under them changes.
  const newest = day(posts[0]?.updated_at)
  const newestByCategory = {}
  for (const p of posts) {
    if (p.category_id && !newestByCategory[p.category_id]) {
      newestByCategory[p.category_id] = day(p.updated_at)
    }
  }

  const urls = [
    url({ loc: BASE_URL, lastmod: newest, changefreq: 'daily', priority: '1.0' }),
    url({ loc: `${BASE_URL}/categories`, lastmod: newest, changefreq: 'weekly', priority: '0.8' }),
    url({ loc: `${BASE_URL}/about`, changefreq: 'yearly', priority: '0.5' }),
    ...categories.map((cat) =>
      url({
        loc: `${BASE_URL}/category/${cat.slug}`,
        lastmod: newestByCategory[cat.id] || newest,
        changefreq: 'weekly',
        priority: '0.7',
      })
    ),
    ...posts.map((post) =>
      url({
        loc: `${BASE_URL}/post/${post.slug}`,
        lastmod: day(post.updated_at),
        changefreq: 'monthly',
        priority: '0.8',
      })
    ),
  ].join('')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
