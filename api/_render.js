// Server-side HTML for the pre-paint shell. Mirrors what React renders on the
// client so the swap at hydration is invisible — and so crawlers that never run
// JS still get the full article.
//
// Every Tailwind class used here also appears in a .tsx file, so it survives
// Tailwind's content scan. Affiliate-block styling uses the hand-authored
// .aff-* classes in src/index.css for the same reason.

import { tokenize, rewriteExternalLinks } from "./_shortcodes.js";

export function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PROSE_CLASS =
  "prose prose-invert prose-lg max-w-none leading-relaxed [&_h2]:font-display [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-foreground [&_p]:text-white [&_a]:!text-blue-400 [&_a]:underline [&_a:hover]:text-blue-300 [&_strong]:text-foreground [&_li]:text-white";

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

export function renderPostBody(post, category) {
  const crumbs =
    `<nav class="mb-8 text-sm text-muted-foreground">` +
    `<a href="/" class="hover:text-primary">Home</a> <span class="text-border">/</span> ` +
    (category
      ? `<a href="/category/${esc(category.slug)}" class="hover:text-primary">${esc(category.name)}</a> <span class="text-border">/</span> `
      : "") +
    `<span class="text-foreground">${esc(post.title)}</span></nav>`;

  const cover = post.cover_image
    ? `<img src="${esc(post.cover_image)}" alt="${esc(post.title)}" width="1200" height="675"` +
      ` class="w-full rounded-xl mb-8 aspect-video object-cover border border-border" fetchpriority="high"/>`
    : "";

  return shell(
    `<article class="max-w-3xl mx-auto">` +
      crumbs +
      cover +
      `<h1 class="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 leading-tight">${esc(post.title)}</h1>` +
      renderDisclosure() +
      renderContent(post.content) +
      `</article>`
  );
}

export function renderNotFoundBody() {
  return shell(
    `<div class="text-center py-20"><h1 class="mb-4 text-4xl font-bold text-foreground">404</h1>` +
      `<p class="mb-4 text-xl text-muted-foreground">This page does not exist.</p>` +
      `<a href="/" class="text-primary underline">Return to Home</a></div>`
  );
}
