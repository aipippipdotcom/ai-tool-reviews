/**
 * Provider-agnostic event tracking.
 *
 * Whichever of Plausible / GA4 is present on the page receives the event, so
 * the analytics vendor can be swapped in index.html without touching any
 * component. With neither installed this is a no-op (plus a console line in dev).
 */

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Props; callback?: () => void }) => void;
    gtag?: (command: string, event: string, params?: Props) => void;
    dataLayer?: unknown[];
    /** Server-rendered data seeded by api/post-meta.js. */
    __PRELOAD__?: { post?: Record<string, unknown> };
  }
}

export function track(event: string, props: Props = {}) {
  const clean: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }

  try {
    window.plausible?.(event, { props: clean });
    window.gtag?.("event", event, clean);
  } catch {
    /* analytics must never break the page */
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[track]", event, clean);
  }
}

/** The event that actually matters: someone left for a merchant. */
export function trackAffiliateClick(params: {
  url: string;
  placement: string;
  label?: string;
  postSlug?: string;
}) {
  let domain = "";
  try {
    domain = new URL(params.url).hostname.replace(/^www\./, "");
  } catch {
    /* malformed href — still worth recording the placement */
  }

  track("affiliate_click", {
    placement: params.placement,
    merchant: domain,
    label: params.label,
    post: params.postSlug,
  });
}
