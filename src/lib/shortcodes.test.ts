import { describe, it, expect } from "vitest";
import {
  tokenize,
  primaryOffer,
  extractVerdict,
  parsePrice,
  rewriteExternalLinks,
} from "./shortcodes";

describe("tokenize", () => {
  it("keeps plain content as a single html token", () => {
    expect(tokenize("<p>hello</p>")).toEqual([{ type: "html", value: "<p>hello</p>" }]);
  });

  it("splits html around a shortcode and parses its attrs", () => {
    const tokens = tokenize('<p>a</p>[cta url="https://x.com" label="Buy"]<p>b</p>');

    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: "html", value: "<p>a</p>" });
    expect(tokens[1]).toEqual({
      type: "cta",
      attrs: { url: "https://x.com", label: "Buy" },
    });
    expect(tokens[2]).toEqual({ type: "html", value: "<p>b</p>" });
  });

  it("parses paired pros/cons blocks into item lists", () => {
    const tokens = tokenize("[pros]Fast|Cheap[/pros][cons]Ugly[/cons]");

    expect(tokens).toEqual([
      { type: "pros", items: ["Fast", "Cheap"] },
      { type: "cons", items: ["Ugly"] },
    ]);
  });

  it("is not confused by square brackets in prose", () => {
    const tokens = tokenize("<p>see [1] and [note]</p>");
    expect(tokens).toEqual([{ type: "html", value: "<p>see [1] and [note]</p>" }]);
  });
});

describe("primaryOffer", () => {
  it("prefers the first offer in document order", () => {
    const offer = primaryOffer(
      '[verdict rating="4" title="A" url="https://a.com" price="$9"]' +
        '[cta url="https://b.com"]'
    );

    expect(offer).toEqual({ url: "https://a.com", label: "Get It Now", price: "$9", title: "A" });
  });

  it("returns null when nothing is monetised", () => {
    expect(primaryOffer("<p>just words</p>")).toBeNull();
  });

  // The 360 existing posts have no shortcodes, only inline links — without
  // this fallback none of them would ever show a sticky CTA.
  it("falls back to the most-linked merchant when there is no shortcode", () => {
    const content =
      '<a href="https://side-source.com/a">cited once</a>' +
      '<a href="https://merchant.com/buy">buy</a>' +
      '<a href="https://merchant.com/buy">buy again</a>' +
      '<a href="/post/internal">internal</a>';

    expect(primaryOffer(content)).toEqual({
      url: "https://merchant.com/buy",
      label: "Get It Now",
      price: "",
      title: "",
    });
  });

  it("ignores internal links when falling back", () => {
    expect(primaryOffer('<a href="https://aipippip.net/post/x">x</a>')).toBeNull();
  });
});

describe("extractVerdict", () => {
  it("reads rating and price for Review schema", () => {
    const verdict = extractVerdict('[verdict rating="4.5" title="Tool" price="$9.95"]');

    expect(verdict?.rating).toBe(4.5);
    expect(verdict?.title).toBe("Tool");
    expect(verdict?.price).toEqual({ price: "9.95", currency: "USD" });
  });

  it("nulls a non-numeric rating rather than emitting a bogus one", () => {
    expect(extractVerdict('[verdict rating="great" title="Tool"]')?.rating).toBeNull();
  });
});

describe("parsePrice", () => {
  it.each([
    ["$9.95", { price: "9.95", currency: "USD" }],
    ["€19", { price: "19", currency: "EUR" }],
    ["29 USD", { price: "29", currency: "USD" }],
    ["1,50", { price: "1.50", currency: "USD" }],
  ])("parses %s", (input, expected) => {
    expect(parsePrice(input)).toEqual(expected);
  });

  it("returns null when there is no number", () => {
    expect(parsePrice("free")).toBeNull();
  });
});

describe("rewriteExternalLinks", () => {
  it("marks outbound links sponsored and trackable", () => {
    const out = rewriteExternalLinks('<a rel="noopener" href="https://shop.com">Buy</a>');

    expect(out).toContain('rel="sponsored nofollow noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('data-aff-link="inline"');
    // The old rel must be replaced, not appended.
    expect(out.match(/rel=/g)).toHaveLength(1);
  });

  it("leaves internal and relative links alone", () => {
    const internal = '<a href="https://aipippip.net/post/x">x</a>';
    const relative = '<a href="/post/x">x</a>';

    expect(rewriteExternalLinks(internal)).toBe(internal);
    expect(rewriteExternalLinks(relative)).toBe(relative);
  });
});
