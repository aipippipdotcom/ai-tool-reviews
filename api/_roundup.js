// Gathers the products a roundup will rank, from reviews already published.
//
// A "best X" article needs real products with real prices and real links. That
// data is already in the site's own reviews, so a roundup is assembled from
// them rather than invented: every entry links to its full review (internal
// linking Google rewards) and to the merchant.

import { tokenize, isExternalHref } from './_shortcodes.js'

/** The offer a review is selling: an explicit shortcode, else its most-linked URL. */
export function offerFromContent(content) {
  for (const t of tokenize(content || '')) {
    if ((t.type === 'verdict' || t.type === 'cta') && t.attrs.url) {
      return {
        url: t.attrs.url,
        rating: t.attrs.rating || '',
        price: t.attrs.price || '',
        productName: t.attrs.title || '',
      }
    }
  }

  const counts = new Map()
  for (const m of String(content || '').matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/gi)) {
    if (!isExternalHref(m[1])) continue
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  }
  if (!counts.size) return null

  const [url] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { url, rating: '', price: '', productName: '' }
}

/**
 * Product name from the slug, not the title.
 *
 * These titles are clickbait sentences ("Okay, Who Peered Into My Soul? My
 * Shocking Review of..."), so trimming one leaves a fragment. The slug is the
 * product name already, hyphenated.
 */
function nameFromSlug(slug) {
  return String(slug || '')
    .replace(/-review.*$/, '')
    .split('-')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim()
}

/** Strips markup and clips, so the prompt gets prose rather than HTML. */
function summarise(content, limit = 700) {
  const text = String(content || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, limit)
}

/**
 * Most-viewed published reviews in a category that actually link somewhere.
 * A review with no offer cannot earn anything from a roundup slot.
 */
export function buildCandidates(posts, limit) {
  const candidates = []

  for (const post of posts) {
    const offer = offerFromContent(post.content)
    if (!offer) continue

    candidates.push({
      productName: offer.productName || nameFromSlug(post.slug),
      reviewUrl: `/post/${post.slug}`,
      reviewTitle: post.title,
      affiliateUrl: offer.url,
      rating: offer.rating,
      price: offer.price,
      views: post.view_count ?? 0,
      excerpt: post.excerpt || '',
      evidence: summarise(post.content),
    })

    if (candidates.length >= limit) break
  }

  return candidates
}

export function formatCandidates(candidates) {
  return candidates
    .map((c, i) => {
      const facts = [
        `PRODUCT ${i + 1}: ${c.productName}`,
        `Internal review URL (link the product name to this): ${c.reviewUrl}`,
        `Affiliate URL (use in its shortcode): ${c.affiliateUrl}`,
        c.rating ? `Rating given in that review: ${c.rating}` : null,
        c.price ? `Price stated in that review: ${c.price}` : null,
        c.excerpt ? `Summary: ${c.excerpt}` : null,
        `Evidence from the review, your only source of fact for this product:\n${c.evidence}`,
      ].filter(Boolean)

      return facts.join('\n')
    })
    .join('\n\n---\n\n')
}
