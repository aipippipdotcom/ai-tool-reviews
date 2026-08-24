/**
 * Section headings for the article sidebar.
 *
 * A 2000-word review is a wall to scan. Reviews are read out of order — people
 * jump to pricing, to the verdict, to whether there is a refund — and there was
 * no way to do that. Mirrored in api/_render.js.
 */

export interface Heading {
  id: string;
  text: string;
}

const HEADING_RE = /<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi;

function plain(html: string): string {
  return String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function headingId(text: string): string {
  return (
    plain(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "section"
  );
}

/**
 * Adds an id to every h3 so the sidebar can link to it, and returns what it
 * found. Ids are deduplicated: "Pricing" twice would otherwise anchor both
 * links to the first one.
 */
export function withHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();

  const out = String(html || "").replace(HEADING_RE, (_m, attrs: string, inner: string) => {
    const text = plain(inner);
    if (!text) return _m;

    const base = headingId(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;

    headings.push({ id, text });
    const cleaned = attrs.replace(/\s*\bid="[^"]*"/gi, "");
    return `<h3 id="${id}"${cleaned}>${inner}</h3>`;
  });

  return { html: out, headings };
}
