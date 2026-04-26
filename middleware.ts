import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname
  
  if (!url.startsWith('/post/')) {
    return NextResponse.next()
  }

  const slug = url.replace('/post/', '')
  
  const SUPABASE_URL = 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?slug=eq.${slug}&select=title,meta_title,meta_description,cover_image&limit=1`,
      { headers: { apikey: SUPABASE_KEY } }
    )
    const posts = await res.json()
    const post = posts[0]

    if (!post) return NextResponse.next()

    const title = post.meta_title || post.title
    const description = post.meta_description || ''
    const image = post.cover_image || 'https://aipippip.net/og-image.png'

    const html = await fetch(request.url).then(r => r.text())
    
    const injected = html
      .replace(
        '<title>AIPipPip — AI Tool Reviews & Digital Product Comparisons</title>',
        `<title>${title} — AIPipPip</title>`
      )
      .replace(
        '<meta name="description" content="In-depth reviews, honest comparisons, and expert insights on the best AI tools and digital products. Find the right tool, save time and money." />',
        `<meta name="description" content="${description}" />`
      )
      .replace(
        '<meta property="og:title" content="AIPipPip — AI Tool Reviews & Digital Product Comparisons" />',
        `<meta property="og:title" content="${title}" />`
      )
      .replace(
        '<meta property="og:description" content="In-depth reviews, honest comparisons, and expert insights on the best AI tools and digital products. Find the right tool, save time and money." />',
        `<meta property="og:description" content="${description}" />`
      )
      .replace(
        '<meta property="og:image" content="https://aipippip.net/og-image.png" />',
        `<meta property="og:image" content="${image}" />`
      )
      .replace(
        '<meta property="og:url" content="https://aipippip.net" />',
        `<meta property="og:url" content="https://aipippip.net/post/${slug}" />`
      )
      .replace(
        '<link rel="canonical" href="https://aipippip.net" />',
        `<link rel="canonical" href="https://aipippip.net/post/${slug}" />`
      )

    return new NextResponse(injected, {
      headers: { 'content-type': 'text/html' }
    })
  } catch (e) {
    return NextResponse.next()
  }
}

export const config = {
  matcher: '/post/:path*'
}
