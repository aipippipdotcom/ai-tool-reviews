import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RelatedPosts from "@/components/RelatedPosts";
import CommentsSection from "@/components/CommentsSection";
import PostContent from "@/components/PostContent";
import Seo, { BASE_URL, DEFAULT_IMAGE, SITE_NAME } from "@/components/Seo";
import AffiliateDisclosure from "@/components/affiliate/AffiliateDisclosure";
import StickyCta from "@/components/affiliate/StickyCta";
import { extractVerdict, primaryOffer } from "@/lib/shortcodes";
import { format } from "date-fns";
import CategoryIcon from "@/components/CategoryIcon";

const AUTHOR = { "@type": "Person", name: SITE_NAME, url: `${BASE_URL}/about` };
const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.png` },
};

/**
 * api/post-meta.js already fetched this post to build the page's meta tags and
 * server HTML, and hands it over on window.__PRELOAD__. Using it as initialData
 * means the first React render paints the full article instead of wiping the
 * injected HTML and flashing a skeleton — and saves a Supabase round-trip.
 */
function preloadedPost(slug?: string) {
  const post = window.__PRELOAD__?.post as { slug?: string } | undefined;
  return post && post.slug === slug ? post : undefined;
}

const PostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialData: preloadedPost(slug) as any,
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, categories(name, slug, icon)")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();

      if (data) {
        await supabase.rpc("increment_view_count", { post_slug: slug });
      }

      return data;
    },
    enabled: !!slug,
  });

  const category = post?.categories as { name: string; slug: string; icon: string } | null;
  const url = `${BASE_URL}/post/${slug}`;

  // Unknown slug: say so instead of spinning on "Loading..." forever. The
  // server already returns a real 404 status for this URL.
  if (!isLoading && !post) {
    return (
      <>
        <Seo
          title={`Page Not Found — ${SITE_NAME}`}
          description="The page you are looking for does not exist."
          canonical={url}
          noindex
        />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-20 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
            <p className="mb-4 text-xl text-muted-foreground">
              This review does not exist or has been unpublished.
            </p>
            <Link to="/" className="text-primary underline">
              Return to Home
            </Link>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (isLoading || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="aspect-video rounded-xl bg-secondary" />
            <div className="h-10 w-3/4 rounded bg-secondary" />
            <div className="h-4 w-full rounded bg-secondary" />
            <div className="h-4 w-5/6 rounded bg-secondary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const image = post.cover_image || DEFAULT_IMAGE;
  const description = post.meta_description || post.excerpt || "";
  const verdict = extractVerdict(post.content);
  const offer = primaryOffer(post.content);

  const schema: object[] = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title,
      description,
      url,
      image,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      author: AUTHOR,
      publisher: PUBLISHER,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
  ];

  // Only claim a Review when the article actually states a rating — inventing
  // one is a manual-action risk, not just an invalid snippet.
  if (verdict?.rating && verdict.title) {
    schema.push({
      "@type": "Review",
      "@id": `${url}#review`,
      url,
      name: post.title,
      datePublished: post.created_at,
      author: AUTHOR,
      publisher: PUBLISHER,
      reviewRating: {
        "@type": "Rating",
        ratingValue: verdict.rating,
        bestRating: 5,
        worstRating: 1,
      },
      itemReviewed: {
        "@type": "Product",
        name: verdict.title,
        image,
        ...(verdict.price || verdict.url
          ? {
              offers: {
                "@type": "Offer",
                ...(verdict.price
                  ? { price: verdict.price.price, priceCurrency: verdict.price.currency }
                  : {}),
                ...(verdict.url ? { url: verdict.url } : {}),
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
      },
    });
  }

  schema.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: category.name,
              item: `${BASE_URL}/category/${category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 3 : 2,
        name: post.title,
        item: url,
      },
    ],
  });

  return (
    <>
      <Seo
        title={`${post.meta_title || post.title} — ${SITE_NAME}`}
        description={description}
        canonical={url}
        image={image}
        type="article"
        schema={schema}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <article className="max-w-3xl mx-auto">
            <nav className="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span className="text-border mx-1.5">/</span>
              {category && (
                <>
                  <Link
                    to={`/category/${category.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                  <span className="text-border mx-1.5">/</span>
                </>
              )}
              <span className="text-foreground">{post.title}</span>
            </nav>

            {post.cover_image && (
              <img
                src={post.cover_image}
                alt={post.title}
                width={1200}
                height={675}
                fetchPriority="high"
                className="w-full rounded-xl mb-8 aspect-video object-cover border border-border"
              />
            )}

            <div className="flex items-center gap-3 mb-5">
              {category && (
                <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  <CategoryIcon
                    name={category.icon}
                    className="h-3.5 w-3.5 text-primary inline mr-1"
                  />{" "}
                  {category.name}
                </span>
              )}
              <span className="text-border">·</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), "MMM d, yyyy")}
              </span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 leading-tight">
              {post.title}
            </h1>

            <AffiliateDisclosure />

            <PostContent content={post.content} postSlug={slug} />

            {category && (
              <RelatedPosts
                currentPostId={post.id}
                categoryId={post.category_id}
                categoryName={category.name}
                categorySlug={category.slug}
              />
            )}

            <CommentsSection postId={post.id} />
          </article>
        </main>
        <Footer />
      </div>
      <StickyCta
        offer={offer && { ...offer, title: offer.title || post.title }}
        postSlug={slug}
      />
    </>
  );
};

export default PostPage;
