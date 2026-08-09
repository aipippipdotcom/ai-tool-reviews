/**
 * Parses the envelope api/_prompt.js asks the model for:
 *
 *   <<<META>>>
 *   title: ...
 *   slug: ...
 *   <<<CONTENT>>>
 *   <p>…</p>
 *
 * Runs against partial text on every streamed chunk, so it must tolerate an
 * envelope that is still arriving.
 */

export interface ReviewDraft {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  excerpt: string;
  content: string;
  /** True once the CONTENT marker has arrived, i.e. metadata is settled. */
  metaComplete: boolean;
}

const META_MARK = "<<<META>>>";
const CONTENT_MARK = "<<<CONTENT>>>";

const FIELDS: Record<string, keyof ReviewDraft> = {
  title: "title",
  slug: "slug",
  meta_title: "metaTitle",
  meta_description: "metaDescription",
  meta_keywords: "metaKeywords",
  excerpt: "excerpt",
};

/**
 * Affiliate networks whose click URLs are bot-guarded interstitials with no
 * readable text. Mirrors TRACKER_DOMAINS in api/_research.js so the form can
 * warn before a generation is spent.
 */
const TRACKER_DOMAINS = [
  "warriorplus.com",
  "jvz1.com", "jvz2.com", "jvz3.com", "jvz4.com", "jvz5.com",
  "jvz6.com", "jvz7.com", "jvz8.com", "jvz9.com", "jvzoo.com",
  "clickbank.net", "hop.clickbank.net",
  "bit.ly", "tinyurl.com",
];

export function isTrackerUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    return TRACKER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Body words only — shortcodes and tags are not prose the reader gets. */
export function countWords(html: string): number {
  const text = String(html || "")
    .replace(/\[(?:verdict|cta|proscons|pros|cons)[^\]]*\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

/**
 * Enforces in code what the prompt asks for in words.
 *
 * Models drift back to their defaults over a long generation, so the dash ban
 * and the quote style are applied here rather than trusted to instructions.
 * Zero-width characters are stripped because they survive copy-paste invisibly
 * and are a known machine-text fingerprint.
 */
export function sanitizeGenerated(text: string): string {
  return String(text || "")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    // "$25–$75" reads as a range, so say so.
    .replace(/(\d)\s*[–—]\s*(\$?\d)/g, "$1 to $2")
    .replace(/\s*[–—]\s*/g, ", ")
    // The substitution can double up against punctuation already there.
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/\s+,/g, ",");
}

/**
 * Models reach for Markdown even when told to emit HTML, and a Markdown table
 * dropped into an HTML body renders as a row of raw pipe characters. Converting
 * is more reliable than asking again.
 */
export function markdownToHtml(text: string): string {
  const stripP = (line: string) => line.replace(/<\/?p>/gi, "").trim();
  const isRow = (line: string) => /^\|.*\|$/.test(stripP(line));
  const isDivider = (line: string) =>
    /^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(stripP(line).replace(/\s+/g, " ").replace(/ \|/g, "|"));
  const cells = (line: string) =>
    stripP(line)
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());

  const lines = String(text || "").split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; ) {
    if (isRow(lines[i]) && isDivider(lines[i + 1] ?? "")) {
      const header = cells(lines[i]);
      i += 2;

      const rows: string[][] = [];
      while (i < lines.length && isRow(lines[i]) && !isDivider(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }

      out.push(
        "<table><thead><tr>" +
          header.map((h) => `<th>${h}</th>`).join("") +
          "</tr></thead><tbody>" +
          rows.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") +
          "</tbody></table>"
      );
      continue;
    }

    out.push(lines[i]);
    i++;
  }

  return (
    out
      .join("\n")
      // A shortcode is [name attrs] with no following bracket, so it cannot be
      // mistaken for a Markdown link.
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/(^|[^*])\*\*([^*\n]+)\*\*/g, "$1<strong>$2</strong>")
      .replace(/^\s*#{2,4}\s+(.+)$/gm, "<h3>$1</h3>")
  );
}

export function parseReviewDraft(raw: string): ReviewDraft {
  const draft: ReviewDraft = {
    title: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    excerpt: "",
    content: "",
    metaComplete: false,
  };

  let text = sanitizeGenerated(raw);

  // Models occasionally wrap the whole reply in a code fence.
  text = text.replace(/^\s*```(?:html|markdown)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  const metaAt = text.indexOf(META_MARK);
  const contentAt = text.indexOf(CONTENT_MARK);

  // No envelope at all: treat everything as body rather than losing the draft.
  if (metaAt === -1 && contentAt === -1) {
    draft.content = markdownToHtml(text.trim());
    return draft;
  }

  const metaBlock = text.slice(
    metaAt === -1 ? 0 : metaAt + META_MARK.length,
    contentAt === -1 ? text.length : contentAt
  );

  for (const line of metaBlock.split("\n")) {
    const match = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = FIELDS[match[1].toLowerCase()];
    if (key && key !== "metaComplete") {
      (draft[key] as string) = match[2].trim();
    }
  }

  if (contentAt !== -1) {
    draft.metaComplete = true;
    draft.content = markdownToHtml(text.slice(contentAt + CONTENT_MARK.length).trim());
  }

  if (!draft.slug && draft.title) draft.slug = slugify(draft.title);
  if (draft.slug) draft.slug = slugify(draft.slug);

  return draft;
}

/** Problems worth blocking on before this reaches the editor. */
export function reviewDraftIssues(draft: ReviewDraft, minWords: number): string[] {
  const issues: string[] = [];
  const words = countWords(draft.content);

  if (!draft.title) issues.push("No title was produced.");
  if (!draft.content) issues.push("No article body was produced.");
  if (words < minWords) issues.push(`${words} words — under the ${minWords} floor.`);
  if (!draft.metaDescription) issues.push("No meta description.");
  if (!draft.excerpt) issues.push("No excerpt.");
  if (!/\[verdict/i.test(draft.content)) issues.push("No [verdict] block.");
  const ctas = (draft.content.match(/\[cta\b/gi) || []).length;
  if (!ctas) issues.push("No [cta] block.");
  else if (ctas < 2) issues.push("Only one [cta]; a review should offer two or three.");
  if (!/\[proscons/i.test(draft.content)) issues.push("No [proscons] block.");
  if (/<h[12]\b/i.test(draft.content)) issues.push("Body contains an h1 or h2; the page supplies those.");
  if (/<img\b/i.test(draft.content)) issues.push("Body contains an image; add those yourself.");
  // Tiptap has no table extension, so a table is flattened into a run-on
  // paragraph of concatenated cells rather than dropped visibly.
  // Markdown that survived conversion renders as literal punctuation.
  if (/^\s*\|.*\|\s*$/m.test(draft.content)) issues.push("Body has a Markdown table.");
  if (/\*\*[^*\n]+\*\*/.test(draft.content)) issues.push("Body has Markdown bold.");

  const inlineLinks = (draft.content.match(/<a\s[^>]*href=/gi) || []).length;
  if (inlineLinks < 2) {
    issues.push(`Only ${inlineLinks} inline link(s); two or three read as natural.`);
  }

  return issues;
}
