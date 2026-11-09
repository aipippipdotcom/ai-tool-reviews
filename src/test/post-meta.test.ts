import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Exercises the real request path of api/post-meta.js, which serves every page
 * on the site.
 *
 * A refactor left sb() unimported here. Every route threw, the handler's catch
 * turned that into a 404, and the entire site answered 404 with nothing in the
 * logs. Importing the module does not run any of that; only calling it does.
 */

const CATEGORY = { id: "cat-1", name: "EBook/PLR", slug: "ebook-plr", sort_order: 1 };
const POST = {
  id: "p1",
  title: "TubeForge Review",
  slug: "tubeforge-review",
  excerpt: "Blurb.",
  content: '<p>Body</p>[verdict rating="4.2" title="TubeForge" url="https://m.com/x"]',
  cover_image: "https://img/x.png",
  category_id: "cat-1",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

function stubSupabase({ posts = [POST], categories = [CATEGORY] } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/categories") ? categories : posts;
      return new Response(JSON.stringify(body), { status: 200 });
    })
  );
}

/** Minimal stand-in for the Vercel Node response object. */
function fakeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(k: string, v: string) {
      this.headers[k] = v;
      return this;
    },
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    send(b: string) {
      this.body = b;
      return this;
    },
  };
}

async function get(path: string) {
  const { default: handler } = await import("../../api/post-meta.js");
  const res = fakeRes();
  await handler({ url: `/api/post-meta?path=${path}` }, res);
  return res;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("post-meta handler", () => {
  it("serves the homepage with content and preloaded data", async () => {
    stubSupabase();
    const res = await get("/");

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title");
    expect(res.body).toContain('href="/post/tubeforge-review"');
    expect(res.body).toContain("__PRELOAD__");
  });

  it("serves an article with its conversion blocks rendered", async () => {
    stubSupabase();
    const res = await get("/post/tubeforge-review");

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("aff-box__eyebrow");
    expect(res.body).toContain('"@type":"Review"');
    // The shortcode must not survive into the markup as literal text.
    expect(res.body.split("__PRELOAD__")[0]).not.toContain("[verdict");
  });

  it("serves a category listing", async () => {
    stubSupabase();
    const res = await get("/category/ebook-plr");

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("EBook/PLR");
    expect(res.body).toContain('href="/post/tubeforge-review"');
  });

  /**
   * Only the first 12 posts of a category used to be linked anywhere a crawler
   * could follow: later ones sat behind a "Load more" button.
   */
  it("pages a category with real links, and 404s past the last page", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...POST, id: `p${i}`, slug: `post-${i}` }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/categories")) return new Response(JSON.stringify([CATEGORY]));
        const offset = Number(url.match(/offset=(\d+)/)?.[1] ?? 0);
        const limit = Number(url.match(/limit=(\d+)/)?.[1] ?? many.length);
        return new Response(JSON.stringify(many.slice(offset, offset + limit)));
      })
    );

    const first = await get("/category/ebook-plr");
    expect(first.body).toContain('href="/category/ebook-plr/page/2"');
    expect(first.body).toContain('href="/category/ebook-plr/page/3"');

    const second = await get("/category/ebook-plr/page/2");
    expect(second.statusCode).toBe(200);
    expect(second.body).toContain('rel="canonical" href="https://aipippip.net/category/ebook-plr/page/2"');
    expect(second.body).toContain('href="/post/post-12"');
    expect(second.body).toContain("Page 2 of 3");

    expect((await get("/category/ebook-plr/page/4")).statusCode).toBe(404);

    const one = await get("/category/ebook-plr/page/1");
    expect(one.statusCode).toBe(301);
    expect(one.headers.Location).toBe("/category/ebook-plr");
  });

  it("renders related posts into the article HTML", async () => {
    const other = { ...POST, id: "p2", slug: "other-review", title: "Other Review" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/categories")) return new Response(JSON.stringify([CATEGORY]));
        if (url.includes("id=neq.")) return new Response(JSON.stringify([other]));
        return new Response(JSON.stringify([POST]));
      })
    );

    const res = await get("/post/tubeforge-review");
    // The preload script sits in <head>; check the rendered body, not the JSON.
    const html = res.body.split("</head>")[1];
    expect(html).toContain("Related Posts");
    expect(html).toContain('href="/post/other-review"');
  });

  it("404s an unknown slug, and marks it noindex", async () => {
    stubSupabase({ posts: [] });
    const res = await get("/post/does-not-exist");

    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("noindex");
  });

  // Facebook, Google Ads and every email client append their own parameters.
  it("ignores tracking parameters appended to the path", async () => {
    stubSupabase();
    const { default: handler } = await import("../../api/post-meta.js");
    const res = fakeRes();
    await handler(
      { url: "/api/post-meta?path=/post/tubeforge-review&fbclid=IwAR123" },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("aff-box__eyebrow");
  });

  /**
   * og-image.png was referenced by every page that has no cover of its own and
   * had never existed in public/. Requesting it returned 200 because the SPA
   * fallback answers any unknown path with HTML, so a status check looked fine
   * while Facebook got markup where it wanted an image.
   */
  it("ships the default share image it advertises", async () => {
    const { statSync } = await import("node:fs");
    // import.meta.url is not a file: URL under the jsdom environment.
    const stat = statSync("public/og-image.png");

    expect(stat.size).toBeGreaterThan(5_000);
  });

  it("declares dimensions only for the image whose size is known", async () => {
    stubSupabase();

    const home = await get("/");
    expect(home.body).toContain('property="og:image:width"');

    // A post cover is whatever shape the author uploaded.
    const post = await get("/post/tubeforge-review");
    expect(post.body).toContain('property="og:image" content="https://img/x.png"');
    expect(post.body).not.toContain('property="og:image:width"');
  });

  /**
   * The regression itself: a broken resolve() must not masquerade as a missing
   * page, or a site-wide outage looks like ordinary 404 traffic.
   */
  it("answers 503, not 404, when the database is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    const res = await get("/post/tubeforge-review");

    expect(res.statusCode).toBe(503);
    expect(res.body).toContain("network down");
  });
});
