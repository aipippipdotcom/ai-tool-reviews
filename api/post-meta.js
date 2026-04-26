export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  
  const SUPABASE_URL = 'https://jcgcyrqsaodwaoryxcwy.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?slug=eq.${slug}&select=title,meta_title,meta_description,cover_image&limit=1`,
    { headers: { apikey: SUPABASE_KEY } }
  )
  const posts = await res.json()
  const post = posts[0]

  return Response.json(post || null)
}
