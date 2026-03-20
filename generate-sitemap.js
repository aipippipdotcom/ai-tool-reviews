import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabase = createClient(
  'https://jcgcyrqsaodwaoryxcwy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'
)

const BASE_URL = 'https://aipippip.net'

const { data: posts } = await supabase
  .from('posts')
  .select('slug, updated_at')
  .eq('published', true)

const { data: categories } = await supabase
  .from('categories')
  .select('slug')

const staticPages = ['', '/categories', '/about']

let urls = staticPages.map(path => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('')

urls += categories?.map(cat => `
  <url>
    <loc>${BASE_URL}/category/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('') ?? ''

urls += posts?.map(post => `
  <url>
    <loc>${BASE_URL}/post/${post.slug}</loc>
    <lastmod>${post.updated_at?.split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('') ?? ''

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

writeFileSync('public/sitemap.xml', sitemap)
console.log(`✅ Sitemap generated with ${posts?.length} posts!`)
