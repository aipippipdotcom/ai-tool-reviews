import { describe, it, expect } from "vitest";
import {
  parseReviewDraft,
  reviewDraftIssues,
  countWords,
  slugify,
} from "./reviewDraft";

const FULL = `<<<META>>>
title: StoryCraft Kids Review: I Tried All 346 Prompts
slug: storycraft-kids-review
meta_title: StoryCraft Kids Review 2026
meta_description: An honest look at StoryCraft Kids after two weeks of bedtime stories.
meta_keywords: storycraft kids, ai bedtime stories, plr prompts
excerpt: I tested every prompt. Here is what held up.
<<<CONTENT>>>
<p>It was 9pm and I had no story left in me.</p>
[verdict rating="4.3" title="StoryCraft Kids" url="https://merchant.com/x" price="$17"]
<h3>Key Features</h3>
[proscons pros="Cheap|Fast" cons="Niche"]
[cta url="https://merchant.com/x" label="Get Instant Access"]`;

describe("parseReviewDraft", () => {
  it("splits metadata from body", () => {
    const draft = parseReviewDraft(FULL);

    expect(draft.title).toBe("StoryCraft Kids Review: I Tried All 346 Prompts");
    expect(draft.slug).toBe("storycraft-kids-review");
    expect(draft.metaTitle).toBe("StoryCraft Kids Review 2026");
    expect(draft.metaKeywords).toContain("ai bedtime stories");
    expect(draft.excerpt).toBe("I tested every prompt. Here is what held up.");
    expect(draft.metaComplete).toBe(true);
    expect(draft.content).toContain("<h3>Key Features</h3>");
    expect(draft.content).not.toContain("meta_title");
  });

  // parse() runs on every streamed chunk, so half an envelope is the norm.
  it("tolerates a partial stream", () => {
    const partial = parseReviewDraft("<<<META>>>\ntitle: Half A Title\nslug: half");

    expect(partial.title).toBe("Half A Title");
    expect(partial.metaComplete).toBe(false);
    expect(partial.content).toBe("");
  });

  it("keeps the body when the model skips the envelope", () => {
    const draft = parseReviewDraft("<p>Just prose.</p>");

    expect(draft.content).toBe("<p>Just prose.</p>");
    expect(draft.title).toBe("");
  });

  it("unwraps a fenced reply", () => {
    const draft = parseReviewDraft("```html\n<<<META>>>\ntitle: Fenced\n<<<CONTENT>>>\n<p>Body</p>\n```");

    expect(draft.title).toBe("Fenced");
    expect(draft.content).toBe("<p>Body</p>");
  });

  it("derives a slug from the title when one is missing", () => {
    const draft = parseReviewDraft("<<<META>>>\ntitle: Sci-Fi Sagas Review!\n<<<CONTENT>>>\n<p>x</p>");

    expect(draft.slug).toBe("sci-fi-sagas-review");
  });

  it("normalises a slug the model formatted loosely", () => {
    const draft = parseReviewDraft("<<<META>>>\ntitle: T\nslug: Some Title Review\n<<<CONTENT>>>\n<p>x</p>");

    expect(draft.slug).toBe("some-title-review");
  });
});

describe("countWords", () => {
  it("counts prose, not markup or shortcodes", () => {
    expect(countWords('<p>one two three</p>[cta url="x" label="Get It Now"]')).toBe(3);
  });

  it("returns zero for an empty body", () => {
    expect(countWords("")).toBe(0);
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Đánh giá: Sản phẩm!")).toBe("anh-gia-san-pham");
  });
});

describe("reviewDraftIssues", () => {
  it("passes a complete draft", () => {
    const draft = parseReviewDraft(FULL);
    // Well under the real floor; length is asserted separately.
    expect(reviewDraftIssues(draft, 5)).toEqual([]);
  });

  it("flags a short draft", () => {
    const draft = parseReviewDraft(FULL);
    expect(reviewDraftIssues(draft, 2000).join(" ")).toContain("under the 2000");
  });

  it("flags missing conversion blocks", () => {
    const draft = parseReviewDraft(
      "<<<META>>>\ntitle: T\nmeta_description: d\nexcerpt: e\n<<<CONTENT>>>\n<p>No blocks here.</p>"
    );
    const issues = reviewDraftIssues(draft, 1).join(" ");

    expect(issues).toContain("[verdict]");
    expect(issues).toContain("[cta]");
    expect(issues).toContain("[proscons]");
  });

  it("flags markup the page already supplies", () => {
    const draft = parseReviewDraft(
      "<<<META>>>\ntitle: T\n<<<CONTENT>>>\n<h1>Dup</h1><h2>Also</h2><img src='x'>"
    );
    const issues = reviewDraftIssues(draft, 1).join(" ");

    expect(issues).toContain("h1 or h2");
    expect(issues).toContain("image");
  });
});
