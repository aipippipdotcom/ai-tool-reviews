// Shared read helper for the API functions.
//
// This lived privately inside post-meta.js and was called from
// generate-review.js, where it did not exist: a ReferenceError that crashed the
// function before it reached the model. One definition, imported.

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jcgcyrqsaodwaoryxcwy.supabase.co'

export const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY'

/** GETs a PostgREST path. Returns null on any non-OK response. */
export async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON },
  })
  if (!res.ok) return null
  return res.json()
}
