// Server-side HTML for the pre-paint shell. Mirrors what React renders on the
// client so the swap at hydration is invisible — and so crawlers that never run
// JS still get the full article.
//
// Every Tailwind class used here also appears in a .tsx file, so it survives
// Tailwind's content scan. Affiliate-block styling uses the hand-authored
// .aff-* classes in src/index.css for the same reason.

import { tokenize, rewriteExternalLinks, primaryOffer } from "./_shortcodes.js";

/** Mirrors src/lib/toc.ts. */
function plainText(html) {
  return String(html || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

export function headingId(text) {
  return plainText(text).toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").slice(0, 60) || "section";
}

export function withHeadingIds(html) {
  const headings = [];
  const seen = new Map();
  const out = String(html || "").replace(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi, (m, attrs, inner) => {
    const text = plainText(inner);
    if (!text) return m;
    const base = headingId(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    headings.push({ id, text });
    return `<h3 id="${id}"${attrs.replace(/\s*\bid="[^"]*"/gi, "")}>${inner}</h3>`;
  });
  return { html: out, headings };
}

/**
 * Mirrors categoryLabel in src/lib/format.ts. Category rows carry a "Review "
 * prefix from how they were entered, which does not belong in a heading.
 */
export function categoryLabel(name) {
  return String(name || '').replace(/^\s*Review\s+/i, '').trim();
}

export function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Must stay identical to PROSE_CLASS in src/components/PostContent.tsx. */
const PROSE_CLASS = "article";

function affLink(url, label, extraClass) {
  return (
    `<a class="aff-btn ${extraClass}" href="${esc(url)}" target="_blank"` +
    ` rel="sponsored nofollow noopener noreferrer" data-aff-link="cta">` +
    `${esc(label)} <span aria-hidden="true">→</span></a>`
  );
}

function priceBlock(price, was) {
  if (!price) return "";
  return (
    `<span class="aff-price"><span class="aff-price__now">${esc(price)}</span>` +
    (was ? `<span class="aff-price__was">${esc(was)}</span>` : "") +
    `</span>`
  );
}

function ratingBlock(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value) || value <= 0) return "";
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    `<div class="aff-rating">` +
    `<span class="aff-stars" role="img" aria-label="${esc(value)} out of 5">` +
    `<span class="aff-stars__fill" style="width:${pct}%"></span></span>` +
    `<span class="aff-rating__score">${esc(value)}</span>` +
    `<span class="aff-rating__max">/ 5</span>` +
    `</div>`
  );
}

function renderCta(a) {
  if (!a.url) return "";
  return (
    `<div class="aff-box">` +
    (a.eyebrow ? `<p class="aff-box__eyebrow">${esc(a.eyebrow)}</p>` : "") +
    (a.title ? `<p class="aff-box__title">${esc(a.title)}</p>` : "") +
    (a.summary ? `<p class="aff-box__summary">${esc(a.summary)}</p>` : "") +
    `<div class="aff-box__cta">${priceBlock(a.price, a.was)}` +
    affLink(a.url, a.label || "Get It Now", "aff-btn--lg") +
    `</div>` +
    (a.note ? `<p class="aff-box__note">${esc(a.note)}</p>` : "") +
    `</div>`
  );
}

function renderVerdict(a) {
  return (
    `<div class="aff-box">` +
    `<p class="aff-box__eyebrow">${esc(a.eyebrow || "Our Verdict")}</p>` +
    ratingBlock(a.rating) +
    (a.title ? `<p class="aff-box__title">${esc(a.title)}</p>` : "") +
    (a.summary ? `<p class="aff-box__summary">${esc(a.summary)}</p>` : "") +
    (a.url
      ? `<div class="aff-box__cta">${priceBlock(a.price, a.was)}` +
        affLink(a.url, a.label || "Get It Now", "aff-btn--lg") +
        `</div>`
      : "") +
    (a.note ? `<p class="aff-box__note">${esc(a.note)}</p>` : "") +
    `</div>`
  );
}

function renderList(items, kind) {
  const heading = kind === "pros" ? "Pros" : "Cons";
  return (
    `<div class="aff-col aff-col--${kind}">` +
    `<p class="aff-col__head">${heading}</p>` +
    `<ul class="aff-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` +
    `</div>`
  );
}

function renderProsCons(pros, cons) {
  if (!pros.length && !cons.length) return "";
  return (
    `<div class="aff-proscons">` +
    (pros.length ? renderList(pros, "pros") : "") +
    (cons.length ? renderList(cons, "cons") : "") +
    `</div>`
  );
}

export const DISCLOSURE_TEXT =
  "Some links on this page are affiliate links. If you buy through them we may earn a commission at no extra cost to you. This never changes our verdict — we only recommend products we have actually used.";

export function renderDisclosure() {
  return (
    `<div class="aff-disclosure"><span aria-hidden="true">ⓘ</span>` +
    `<span>${esc(DISCLOSURE_TEXT)}</span></div>`
  );
}

/** Content HTML with shortcodes expanded and outbound links marked sponsored. */
export function renderContent(content) {
  const tokens = tokenize(content || "");
  let out = "";

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.type === "html") {
      const trimmed = (t.value || "").trim();
      if (trimmed) {
        out += `<div class="${PROSE_CLASS}">${rewriteExternalLinks(trimmed)}</div>`;
      }
      continue;
    }
    if (t.type === "cta") {
      out += renderCta(t.attrs);
      continue;
    }
    if (t.type === "verdict") {
      out += renderVerdict(t.attrs);
      continue;
    }
    if (t.type === "proscons") {
      out += renderProsCons(
        String(t.attrs.pros || "").split("|").map((s) => s.trim()).filter(Boolean),
        String(t.attrs.cons || "").split("|").map((s) => s.trim()).filter(Boolean)
      );
      continue;
    }
    if (t.type === "pros") {
      // A bare [pros] block pairs with an adjacent [cons] block if there is one.
      const next = tokens[i + 1];
      const nextIsCons = next && next.type === "cons";
      out += renderProsCons(t.items, nextIsCons ? next.items : []);
      if (nextIsCons) i++;
      continue;
    }
    if (t.type === "cons") {
      out += renderProsCons([], t.items);
    }
  }

  return out;
}

function shell(inner) {
  return (
    `<div class="min-h-screen flex flex-col">` +
    `<header class="sticky top-0 z-50 glass border-b border-border">` +
    `<div class="container mx-auto px-4 h-16 flex items-center justify-between">` +
    `<a href="/" class="flex items-center gap-2.5">` +
    `<span class="font-display text-xl font-bold">` +
    `<span class="text-gradient">AI</span><span class="text-foreground">PipPip</span>` +
    `<span class="text-red-500">.Net</span></span></a>` +
    `<nav class="hidden md:flex items-center gap-1">` +
    `<a href="/" class="px-3 py-2 text-sm font-bold text-foreground">Home</a>` +
    `<a href="/categories" class="px-3 py-2 text-sm font-bold text-foreground">Categories</a>` +
    `<a href="/about" class="px-3 py-2 text-sm font-bold text-foreground">About</a>` +
    `</nav></div></header>` +
    `<main class="flex-1 container mx-auto px-4 py-10">${inner}</main>` +
    `</div>`
  );
}

/** Minutes to read, at 200 wpm. Mirrored in src/lib/utils.ts. */
function readingTime(html) {
  const words = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}


/** Mirrors src/components/article/ArticleAside.tsx. */
function renderAside(offer, rating, headings) {
  if (!offer && headings.length < 3) return `<aside class="hidden xl:block"></aside>`;

  const verdict = offer
    ? `<div class="rounded-xl border border-primary/25 bg-card p-5">` +
      `<p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">The verdict</p>` +
      (offer.title
        ? `<p class="mt-2 font-display text-base font-bold leading-snug text-foreground">${esc(offer.title)}</p>`
        : "") +
      (rating ? `<div class="mt-2.5">${ratingBlock(rating)}</div>` : "") +
      (offer.price
        ? `<p class="mt-3 font-display text-2xl font-bold text-foreground">${esc(offer.price)}</p>`
        : "") +
      `<div class="mt-4">` +
      `<a class="aff-btn aff-btn--block" href="${esc(offer.url)}" target="_blank"` +
      ` rel="sponsored nofollow noopener noreferrer" data-aff-link="aside">` +
      `${esc(offer.label)} <span aria-hidden="true">&rarr;</span></a></div></div>`
    : "";

  const toc =
    headings.length >= 3
      ? `<nav class="rounded-xl border border-border bg-card p-5">` +
        `<p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">On this page</p>` +
        `<ul class="mt-3 space-y-2">` +
        headings
          .map(
            (h) =>
              `<li><a href="#${esc(h.id)}" class="block text-[13px] leading-snug text-muted-foreground">${esc(
                h.text
              )}</a></li>`
          )
          .join("") +
        `</ul></nav>`
      : "";

  return `<aside class="hidden xl:block"><div class="sticky top-24 space-y-5">${verdict}${toc}</div></aside>`;
}

// Layout mirrors src/pages/PostPage.tsx so the React takeover is invisible.
export function renderPostBody(post, category) {
  const crumbs =
    `<nav class="mb-7 flex items-center gap-1.5 text-sm text-muted-foreground">` +
    `<a href="/" class="shrink-0 hover:text-primary">Home</a><span class="text-border">/</span>` +
    (category
      ? `<a href="/category/${esc(category.slug)}" class="hover:text-primary">${esc(categoryLabel(category.name))}</a><span class="text-border">/</span>`
      : "") +
    `<span class="min-w-0 truncate text-foreground">${esc(post.title)}</span></nav>`;

  const meta =
    `<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-5 text-[11px]">` +
    (category
      ? `<span class="inline-flex items-center gap-1.5 font-medium uppercase tracking-wider text-primary">${esc(categoryLabel(category.name))}</span>` +
        `<span class="text-border">·</span>`
      : "") +
    `<time datetime="${esc(post.created_at)}" class="uppercase tracking-wider text-muted-foreground">${esc(formatDate(post.created_at))}</time>` +
    `<span class="text-border">·</span>` +
    `<span class="uppercase tracking-wider text-muted-foreground">${readingTime(post.content)} min read</span>` +
    `</div>`;

  const excerpt = post.excerpt
    ? `<p class="mt-5 text-lg md:text-xl leading-relaxed text-muted-foreground text-pretty">${esc(post.excerpt)}</p>`
    : "";

  // Shown whole rather than cropped to 16:9, matching PostPage.
  const cover = post.cover_image
    ? `<img src="${esc(post.cover_image)}" alt="${esc(post.title)}"` +
      ` class="w-full h-auto rounded-xl mt-9 border border-border" fetchpriority="high"/>`
    : "";

  const { html: contentHtml, headings } = withHeadingIds(post.content);
  const offer = primaryOffer(post.content);
  const rating = offer?.rating || "";

  return shell(
    `<div class="mx-auto grid max-w-[46rem] gap-12 xl:max-w-[72rem] xl:grid-cols-[minmax(0,46rem)_19rem]">` +
    `<article>` +
      crumbs +
      meta +
      `<h1 class="font-display text-[2rem] md:text-[2.75rem] font-bold text-foreground leading-[1.12] tracking-[-0.025em] text-balance">${esc(post.title)}</h1>` +
      excerpt +
      cover +
      `<div class="mt-9">${renderDisclosure()}</div>` +
      renderContent(contentHtml) +
      `</article>` +
      renderAside(offer, rating, headings) +
      `</div>`
  );
}

function postCard(post, categoryName) {
  return (
    `<a href="/post/${esc(post.slug)}" class="group block rounded-xl border border-border bg-card overflow-hidden">` +
    `<div class="relative aspect-[16/10] overflow-hidden bg-secondary after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-1/3 after:bg-gradient-to-t after:from-card after:to-transparent">` +
    (post.cover_image
      ? `<img src="${esc(post.cover_image)}" alt="${esc(post.title)}" loading="lazy" class="w-full h-full object-cover"/>`
      : "") +
    `</div><div class="p-5">` +
    (categoryName
      ? `<div class="flex items-center gap-2 mb-3"><span class="text-[11px] font-medium uppercase tracking-wider text-primary">${esc(categoryName)}</span></div>`
      : "") +
    `<h3 class="font-display font-semibold text-foreground line-clamp-2 mb-2 leading-snug">${esc(post.title)}</h3>` +
    (post.excerpt
      ? `<p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">${esc(post.excerpt)}</p>`
      : "") +
    `</div></a>`
  );
}

const CARD_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";

/**
 * Homepage body. Mirrors src/pages/Index.tsx closely enough that the React
 * takeover is invisible, and gives crawlers the internal links that were
 * previously only reachable by running the app.
 */
export function renderHomeBody(sections) {
  const chips = sections
    .map(
      (s) =>
        `<a href="/category/${esc(s.slug)}" class="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">${esc(
          categoryLabel(s.name)
        )}</a>`
    )
    .join("");

  const masthead =
    `<section class="mb-14 md:mb-16 pt-2 md:pt-6">` +
    `<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-4 text-balance">Independent reviews · No tool gets a free pass</p>` +
    `<h1 class="font-display text-[2rem] md:text-5xl font-bold text-foreground leading-[1.1] tracking-[-0.02em] text-balance max-w-3xl">` +
    `Know what an AI tool really costs <span class="text-gradient">before you pay for it</span></h1>` +
    `<p class="mt-5 text-base md:text-lg leading-relaxed text-muted-foreground max-w-xl text-pretty">` +
    `Hands-on reviews of AI tools and digital products: real pricing, the limits the sales page skips, and who should walk away.</p>` +
    `<div class="mt-8 max-w-xl"><div class="h-10 w-full rounded-md border border-border bg-secondary"></div></div>` +
    `<nav class="mt-7 flex flex-wrap gap-2">${chips}</nav>` +
    `</section>`;

  const body = sections
    .filter((s) => s.posts.length)
    .map(
      (s) =>
        `<section class="mb-16">` +
        `<div class="flex items-center justify-between mb-8">` +
        `<h2 class="font-display text-xl md:text-2xl font-bold text-foreground">${esc(categoryLabel(s.name))}</h2>` +
        `<a href="/category/${esc(s.slug)}" class="text-sm font-medium text-primary">View all</a>` +
        `</div>` +
        `<div class="${CARD_GRID}">${s.posts.map((p) => postCard(p, "")).join("")}</div>` +
        `</section>`
    )
    .join("");

  return shell(masthead + body);
}

/** Category listing body. Mirrors src/pages/CategoryPage.tsx. */
export function renderCategoryBody(category, description, posts) {
  const head =
    `<div class="mb-10">` +
    `<h1 class="font-display text-3xl md:text-4xl font-bold text-foreground">${esc(categoryLabel(category.name))}</h1>` +
    `<p class="text-muted-foreground mt-2">${esc(description)}</p></div>`;

  const grid = posts.length
    ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">` +
      posts.map((p) => postCard(p, "")).join("") +
      `</div>`
    : `<div class="text-center py-20 rounded-xl border border-border bg-card">` +
      `<p class="text-muted-foreground">No posts in this category yet.</p></div>`;

  return shell(head + grid);
}

export function renderNotFoundBody() {
  return shell(
    `<div class="text-center py-20"><h1 class="mb-4 text-4xl font-bold text-foreground">404</h1>` +
      `<p class="mb-4 text-xl text-muted-foreground">This page does not exist.</p>` +
      `<a href="/" class="text-primary underline">Return to Home</a></div>`
  );
}
