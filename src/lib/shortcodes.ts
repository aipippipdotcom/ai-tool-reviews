/**
 * Client mirror of api/_shortcodes.js — keep the two in sync so the
 * server-rendered HTML and the hydrated React tree agree.
 *
 * Supported syntax inside post content:
 *   [verdict rating="4.5" title="Tool" url="..." label="Get It" price="$9.95"
 *            was="$29" summary="..." note="..."]
 *   [cta url="..." label="Get It Now" price="$9.95" note="..." title="..."]
 *   [proscons pros="a|b|c" cons="x|y"]
 *   [pros]a|b|c[/pros]  [cons]x|y[/cons]
 */

export type ShortcodeAttrs = Record<string, string>;

export type Token =
  | { type: "html"; value: string }
  | { type: "cta" | "verdict" | "proscons"; attrs: ShortcodeAttrs }
  | { type: "pros" | "cons"; items: string[] };

const SHORTCODE_SOURCE =
  /\[(cta|verdict|proscons)\b([^\]]*)\]|\[(pros|cons)\]([\s\S]*?)\[\/\3\]/.source;

export function parseAttrs(raw: string): ShortcodeAttrs {
  const attrs: ShortcodeAttrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw || ""))) attrs[m[1]] = m[2];
  return attrs;
}

export function splitList(value: string | undefined): string[] {
  return String(value || "")
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
export function unwrapShortcodeParagraphs(content: string): string {
  return String(content || "")
    .replace(/<p[^>]*>\s*(\[(?:cta|verdict|proscons)\b[^\]]*\])\s*<\/p>/gi, "$1")
    .replace(/<p[^>]*>\s*(\[(pros|cons)\][\s\S]*?\[\/\2\])\s*<\/p>/gi, "$1");
}

export function tokenize(rawContent: string): Token[] {
  const content = unwrapShortcodeParagraphs(rawContent);
  const tokens: Token[] = [];
  const re = new RegExp(SHORTCODE_SOURCE, "gi");
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content))) {
    if (m.index > last) tokens.push({ type: "html", value: content.slice(last, m.index) });

    if (m[1]) {
      tokens.push({
        type: m[1].toLowerCase() as "cta" | "verdict" | "proscons",
        attrs: parseAttrs(m[2]),
      });
    } else {
      tokens.push({
        type: m[3].toLowerCase() as "pros" | "cons",
        items: splitList(m[4]),
      });
    }
    last = m.index + m[0].length;
  }

  if (last < content.length) tokens.push({ type: "html", value: content.slice(last) });
  return tokens;
}

const INTERNAL_HOSTS = ["aipippip.net", "www.aipippip.net"];

export function isExternalHref(href: string | undefined): boolean {
  if (!/^https?:\/\//i.test(href || "")) return false;
  const host = String(href).replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
  return !INTERNAL_HOSTS.includes(host);
}

/**
 * Every outbound link in a review is monetised, so all of them get
 * rel="sponsored" (Google's stated requirement) plus a click-tracking hook.
 */
export function rewriteExternalLinks(html: string): string {
  return String(html || "").replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
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

export interface Offer {
  url: string;
  label: string;
  price: string;
  title: string;
}

/**
 * The offer a post is really selling — powers the sticky mobile CTA.
 *
 * Prefers an explicit [verdict]/[cta]. Falls back to the most-linked outbound
 * domain, because a review typically links its one merchant many times and
 * incidental sources once. Without the fallback the sticky CTA would never
 * appear on the existing posts, none of which use shortcodes yet.
 */
export function primaryOffer(content: string): Offer | null {
  for (const t of tokenize(content || "")) {
    if ((t.type === "verdict" || t.type === "cta") && t.attrs.url) {
      return {
        url: t.attrs.url,
        label: t.attrs.label || "Get It Now",
        price: t.attrs.price || "",
        title: t.attrs.title || "",
      };
    }
  }

  const counts = new Map<string, number>();
  for (const m of String(content || "").matchAll(
    /<a\b[^>]*href="(https?:\/\/[^"]+)"/gi
  )) {
    if (!isExternalHref(m[1])) continue;
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  if (!counts.size) return null;

  const [url] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { url, label: "Get It Now", price: "", title: "" };
}

/** "$9.95" / "€19" / "29 USD" → { price, currency } */
export function parsePrice(raw: string | undefined) {
  if (!raw) return null;
  const num = String(raw).match(/\d+(?:[.,]\d+)?/);
  if (!num) return null;

  const symbols: Record<string, string> = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "₫": "VND",
  };
  const symbol = Object.keys(symbols).find((s) => String(raw).includes(s));
  const code = String(raw).match(/\b(USD|EUR|GBP|VND|AUD|CAD)\b/i);

  return {
    price: num[0].replace(",", "."),
    currency: code ? code[1].toUpperCase() : symbol ? symbols[symbol] : "USD",
  };
}

export interface Verdict {
  rating: number | null;
  title: string;
  url: string;
  price: ReturnType<typeof parsePrice>;
}

/** Pulls the review verdict out of the content so it can drive Review schema. */
export function extractVerdict(content: string): Verdict | null {
  for (const t of tokenize(content || "")) {
    if (t.type === "verdict") {
      const rating = Number(t.attrs.rating);
      return {
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        title: t.attrs.title || "",
        url: t.attrs.url || "",
        price: parsePrice(t.attrs.price),
      };
    }
  }
  return null;
}
