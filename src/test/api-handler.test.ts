import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Exercises the real request path of api/generate-review.js.
 *
 * The roundup handler shipped calling sb(), which was defined in a different
 * module and did not exist here: a ReferenceError that crashed the function in
 * 352ms with FUNCTION_INVOCATION_FAILED. Unit tests over the pure helpers all
 * passed, because none of them ever entered the handler. These do.
 *
 * The api/ directory is plain JavaScript outside tsconfig's scope, so nothing
 * static checks it either. Calling it is the only cover it has.
 */

const ADMIN_TOKEN = "Bearer valid-token";

/** Stands in for Supabase auth, PostgREST and DeepSeek. */
function stubFetch(overrides: { posts?: unknown[]; deepseekStatus?: number } = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
    }
    if (url.includes("/rpc/has_role")) {
      return new Response("true", { status: 200 });
    }
    if (url.includes("/rest/v1/posts")) {
      return new Response(JSON.stringify(overrides.posts ?? []), { status: 200 });
    }
    if (url.includes("api.deepseek.com")) {
      const status = overrides.deepseekStatus ?? 200;
      if (status !== 200) {
        return new Response(JSON.stringify({ error: { message: "nope" } }), { status });
      }
      const body = new ReadableStream({
        start(c) {
          c.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n'
            )
          );
          c.close();
        },
      });
      // Assert the model was actually asked for something.
      const sent = JSON.parse(String(init?.body ?? "{}"));
      expect(sent.messages?.length).toBeGreaterThan(0);
      return new Response(body, { status: 200 });
    }

    throw new Error(`unstubbed fetch: ${url}`);
  });
}

const reviewPost = (slug: string, url: string) => ({
  title: `${slug} review`,
  slug,
  excerpt: "Blurb.",
  view_count: 10,
  content: `<p>Body</p><a href="${url}">buy</a><a href="${url}">buy again</a>`,
});

async function callHandler(body: unknown) {
  const { default: handler } = await import("../../api/generate-review.js");
  return handler(
    new Request("https://aipippip.net/api/generate-review", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: ADMIN_TOKEN },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generate-review handler", () => {
  it("streams a roundup without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({
        posts: [
          reviewPost("alpha-review", "https://m.com/a"),
          reviewPost("beta-review", "https://m.com/b"),
          reviewPost("gamma-review", "https://m.com/c"),
        ],
      })
    );

    const res = await callHandler({
      mode: "roundup",
      categoryId: "cat-1",
      categoryName: "EBook/PLR",
      count: 3,
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
    expect(decodeURIComponent(res.headers.get("x-research-note") ?? "")).toContain("Alpha");
  });

  it("refuses a roundup with too few linkable reviews", async () => {
    vi.stubGlobal("fetch", stubFetch({ posts: [reviewPost("alpha-review", "https://m.com/a")] }));

    const res = await callHandler({ mode: "roundup", categoryId: "cat-1", count: 5 });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("at least 3");
  });

  it("rejects an unauthenticated call before spending anything", async () => {
    const fetchSpy = stubFetch();
    vi.stubGlobal("fetch", fetchSpy);

    const { default: handler } = await import("../../api/generate-review.js");
    const res = await handler(
      new Request("https://aipippip.net/api/generate-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces DeepSeek's own error wording", async () => {
    vi.stubGlobal("fetch", stubFetch({ deepseekStatus: 402 }));

    const res = await callHandler({
      mode: "review",
      productName: "X",
      affiliateUrl: "https://m.com/x",
      salesPageUrl: "https://m.com/x",
    });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("nope");
  });
});
