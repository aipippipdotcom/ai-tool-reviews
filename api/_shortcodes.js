// Shared shortcode spec. Mirrored on the client in src/lib/shortcodes.ts —
// keep the two in sync so server HTML and hydrated HTML agree.

export const SHORTCODE_RE =
  /\[(cta|verdict|proscons)\b([^\]]*)\]|\[(pros|cons)\]([\s\S]*?)\[\/\3\]/gi;

/**
 * A shortcode is stored as text, so the editor escapes its quotes: what reaches
 * the database is [proscons pros=&quot;A|B&quot;]. Without decoding, attribute
 * parsing finds nothing and the whole conversion block renders as empty and
 * disappears from the published page.
 */
export function decodeEntities(value) {
  return String(value || "")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    // Ampersand last, so a literal "&amp;quot;" is not turned into a quote.
    .replace(/&amp;/gi, "&");
}

export function parseAttrs(raw) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(decodeEntities(raw)))) attrs[m[1]] = m[2];
  return attrs;
}

export function splitList(value) {
  return decodeEntities(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The editor stores a shortcode as ordinary text, so Tiptap wraps it in a
 * paragraph. Splitting on the shortcode would then strand the opening <p> in
 * one fragment and its </p> in the next, leaving an empty paragraph and
 * unbalanced markup. Lift standalone shortcodes out of their wrapper first.
 */
export function unwrapShortcodeParagraphs(content) {
  return String(content || "")
    .replace(
      /<p[^>]*>\s*(\[(?:cta|verdict|proscons)\b[^\]]*\])\s*<\/p>/gi,
      "$1"
    )
    .replace(
      /<p[^>]*>\s*(\[(pros|cons)\][\s\S]*?\[\/\2\])\s*<\/p>/gi,
      "$1"
    );
}

/**
 * Walks the content and returns an ordered list of
 * { type: 'html', value } | { type: 'cta'|'verdict'|'proscons'|'pros'|'cons', attrs, items }
 */
export function tokenize(rawContent) {
  const content = unwrapShortcodeParagraphs(rawContent);
  const tokens = [];
  let last = 0;
  const re = new RegExp(SHORTCODE_RE.source, "gi");
  let m;

  while ((m = re.exec(content))) {
    if (m.index > last) {
      tokens.push({ type: "html", value: content.slice(last, m.index) });
    }
    if (m[1]) {
      tokens.push({ type: m[1].toLowerCase(), attrs: parseAttrs(m[2]) });
    } else {
      tokens.push({ type: m[3].toLowerCase(), items: splitList(m[4]) });
    }
    last = m.index + m[0].length;
  }

  if (last < content.length) {
    tokens.push({ type: "html", value: content.slice(last) });
  }
  return tokens;
}

const INTERNAL_HOSTS = ["aipippip.net", "www.aipippip.net"];

export function isExternalHref(href) {
  if (!/^https?:\/\//i.test(href || "")) return false;
  const host = href.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
  return !INTERNAL_HOSTS.includes(host);
}

/**
 * Every outbound link in a review is a monetised link, so all of them get
 * rel="sponsored" (Google's stated requirement) plus a hook for click tracking.
 */
export function rewriteExternalLinks(html) {
  return String(html || "").replace(/<a\b([^>]*)>/gi, (tag, attrs) => {
    const href = (attrs.match(/href="([^"]*)"/i) || [])[1];
    if (!isExternalHref(href)) return tag;

    const cleaned = attrs
      .replace(/\s*\brel="[^"]*"/gi, "")
      .replace(/\s*\btarget="[^"]*"/gi, "")
      .replace(/\s*\bdata-aff-link="[^"]*"/gi, "")
      .trim();

    return `<a ${cleaned} target="_blank" rel="sponsored nofollow noopener noreferrer" data-aff-link="inline">`;
  });
}

/**
 * The offer a review is selling: an explicit shortcode, else its most-linked
 * outbound URL. Mirrors primaryOffer in src/lib/shortcodes.ts.
 */
export function primaryOffer(content) {
  for (const t of tokenize(content || "")) {
    if ((t.type === "verdict" || t.type === "cta") && t.attrs.url) {
      return {
        url: t.attrs.url,
        label: t.attrs.label || "Get It Now",
        price: t.attrs.price || "",
        title: t.attrs.title || "",
        rating: t.attrs.rating || "",
      };
    }
  }

  const counts = new Map();
  for (const m of String(content || "").matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/gi)) {
    if (!isExternalHref(m[1])) continue;
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  if (!counts.size) return null;

  const [url] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { url, label: "Get It Now", price: "", title: "", rating: "" };
}
