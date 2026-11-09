// Which posts a post links to under "Related Posts". Shared by the server
// render (api/post-meta.js) and the SPA (src/components/RelatedPosts.tsx) so
// crawlers and readers see the same links.
//
// This used to be "the 5 newest posts in the category" — so every post in a
// category linked to the same 5, and the other ~180 posts in the biggest
// category had no internal link at all. Taking the post's neighbours by date
// instead chains every post in a category to the ones either side of it, so
// following "Related Posts" from any post eventually reaches all of them.

export const RELATED_COUNT = 6

/**
 * Interleaves the closest newer and older posts, then orders newest first.
 * Near either end of a category one side runs short, and the other side fills
 * the rest — which is why each side is fetched with the full count.
 *
 * @param {Array<{created_at: string}>} newer ascending by created_at (closest first)
 * @param {Array<{created_at: string}>} older descending by created_at (closest first)
 */
export function pickNeighbours(newer, older, count = RELATED_COUNT) {
  const picked = []
  let n = 0
  let o = 0
  while (picked.length < count && (n < newer.length || o < older.length)) {
    if (n < newer.length) picked.push(newer[n++])
    if (picked.length < count && o < older.length) picked.push(older[o++])
  }
  return picked.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}
