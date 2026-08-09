// Turns an affiliate link into the facts a review needs.
//
// DeepSeek has no web access, so without this step the model invents features,
// prices and guarantees — fatal for a review site. The affiliate URL redirects
// to the vendor's real sales page, which states all of it.

const MAX_BYTES = 900_000;
const MAX_TEXT = 14_000;
const FETCH_TIMEOUT_MS = 15_000;

const BLOCKED_HOST =
  /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * Affiliate networks whose click URLs are bot-guarded interstitials.
 *
 * Verified against warriorplus.com/o2/a/…: even following its nonce
 * meta-refresh with cookies, every hop returns pure JavaScript and zero
 * readable text. These need a headless browser, so instead of scraping
 * garbage we tell the operator to paste the vendor's own sales page.
 */
const TRACKER_DOMAINS = [
  "warriorplus.com",
  "jvz1.com", "jvz2.com", "jvz3.com", "jvz4.com", "jvz5.com",
  "jvz6.com", "jvz7.com", "jvz8.com", "jvz9.com", "jvzoo.com",
  "clickbank.net", "hop.clickbank.net",
  "bit.ly", "tinyurl.com",
];

export function isTrackerUrl(raw) {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    return TRACKER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Only public http(s) origins — the URL comes from a form field. */
export function assertFetchableUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That does not look like a URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links can be read.");
  }
  if (BLOCKED_HOST.test(url.hostname)) {
    throw new Error("That host is not reachable from the server.");
  }
  return url;
}

/** Strips chrome and markup, leaving the prose a reader would actually see. */
export function htmlToText(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Keep block boundaries so headings and list items do not run together.
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Head metadata, which is often all a sales page gives us.
 *
 * Many vendor pages are SPAs whose <body> is an empty root div, but their head
 * still carries a real product title, description and price. Discarding that
 * would throw away the best facts on the page.
 */
export function extractHeadMeta(html) {
  const out = {};
  const pick = (re, key) => {
    const m = String(html || "").match(re);
    if (m && m[1] && !out[key]) out[key] = htmlToText(m[1]).slice(0, 400);
  };

  pick(/<title[^>]*>([\s\S]*?)<\/title>/i, "title");
  pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, "description");
  pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, "ogTitle");
  pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i, "ogDescription");
  pick(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i, "price");

  // JSON-LD Product blocks carry name/description/offers when present.
  for (const m of String(html || "").matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const nodes = [].concat(JSON.parse(m[1].trim()));
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        if (node.name && !out.ldName) out.ldName = String(node.name).slice(0, 200);
        if (node.description && !out.ldDescription) {
          out.ldDescription = String(node.description).slice(0, 600);
        }
        const price = node.offers?.price ?? node.offers?.[0]?.price;
        if (price && !out.ldPrice) out.ldPrice = String(price);
      }
    } catch {
      // Malformed JSON-LD is common; the rest of the page still stands.
    }
  }

  return out;
}

export function formatHeadMeta(meta) {
  const rows = [
    ["Page title", meta.title],
    ["Meta description", meta.description],
    ["OG title", meta.ogTitle],
    ["OG description", meta.ogDescription],
    ["Structured name", meta.ldName],
    ["Structured description", meta.ldDescription],
    ["Declared price", meta.price || meta.ldPrice],
  ].filter(([, v]) => v);

  return rows.map(([k, v]) => `${k}: ${v}`).join("\n");
}

/** Price-shaped strings, most useful first — the model gets these highlighted. */
export function extractPrices(text) {
  const found = String(text || "").match(/(?:[$€£]\s?\d{1,4}(?:[.,]\d{2})?)/g) || [];
  const counts = new Map();
  for (const p of found) {
    const clean = p.replace(/\s/g, "");
    counts.set(clean, (counts.get(clean) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([price, times]) => `${price} (mentioned ${times}x)`);
}

/**
 * WarriorPlus and several other networks bounce through a <meta http-equiv=
 * "refresh"> carrying a nonce, which fetch() does not follow. Without this the
 * scrape stops on the interstitial and never sees the vendor's page.
 */
function metaRefreshTarget(html, currentUrl) {
  const m = String(html || "").match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=['"]?([^'"\s>]+)/i
  );
  if (!m) return null;
  try {
    return new URL(m[1].replace(/['"]$/, ""), currentUrl).toString();
  } catch {
    return null;
  }
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const MAX_META_HOPS = 3;

/**
 * Follows the affiliate link to the vendor page and returns what it says.
 * Never throws: a review can still be written from the operator's notes, so a
 * dead link degrades the result rather than blocking it.
 */
export async function fetchSalesPage(rawUrl) {
  let url;
  try {
    url = assertFetchableUrl(rawUrl);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = String(url);
    let html = "";
    let res;

    for (let hop = 0; hop <= MAX_META_HOPS; hop++) {
      res = await fetch(current, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      });

      if (!res.ok) return { ok: false, error: `Sales page returned ${res.status}.` };

      const type = res.headers.get("content-type") || "";
      if (!type.includes("html")) return { ok: false, error: `Not an HTML page (${type}).` };

      html = (await res.text()).slice(0, MAX_BYTES);
      current = res.url || current;

      const next = metaRefreshTarget(html, current);
      if (!next || next === current) break;

      try {
        assertFetchableUrl(next);
      } catch {
        break;
      }
      current = next;
    }

    const head = extractHeadMeta(html);
    const body = htmlToText(html);
    const headText = formatHeadMeta(head);

    // An SPA sales page has an empty body but a populated head, so either
    // source alone is enough to ground the article.
    if (body.length < 200 && headText.length < 60) {
      return {
        ok: false,
        error: isTrackerUrl(rawUrl)
          ? "That is an affiliate tracking link — it serves a bot-guarded page with no readable text. Paste the vendor's own sales page URL in the second field."
          : "Sales page had almost no readable text (it is probably rendered by JavaScript).",
      };
    }

    const combined = [
      headText && `PAGE METADATA\n${headText}`,
      body.length >= 200 && `PAGE BODY\n${body}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      ok: true,
      finalUrl: current,
      pageTitle: head.ogTitle || head.title || head.ldName || "",
      prices: extractPrices(`${headText}\n${body}`),
      text: combined.slice(0, MAX_TEXT),
      truncated: combined.length > MAX_TEXT,
      bodyOnly: body.length < 200,
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.name === "AbortError" ? "Sales page timed out." : "Could not reach the sales page.",
    };
  } finally {
    clearTimeout(timer);
  }
}
