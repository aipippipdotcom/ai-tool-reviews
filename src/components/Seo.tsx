import { Helmet } from "react-helmet-async";

export const SITE_NAME = "AIPipPip";
export const BASE_URL = "https://aipippip.net";
export const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface SeoProps {
  title: string;
  description: string;
  /** Path or absolute URL. Defaults to the site root. */
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  schema?: object | object[];
}

/**
 * Single owner of every head tag.
 *
 * api/post-meta.js injects the same set server-side tagged with data-rh="true",
 * which react-helmet-async removes on mount before writing its own. That is why
 * this component must emit the *complete* set — anything it omits would be
 * stripped from the server HTML and never restored.
 */
const Seo = ({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  schema,
}: SeoProps) => {
  const url = !canonical
    ? BASE_URL
    : canonical.startsWith("http")
      ? canonical
      : `${BASE_URL}${canonical.startsWith("/") ? "" : "/"}${canonical}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}
      />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(schema)
              ? { "@context": "https://schema.org", "@graph": schema }
              : schema
          )}
        </script>
      )}
    </Helmet>
  );
};

export default Seo;
