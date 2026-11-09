import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";
import CategoryIcon from "@/components/CategoryIcon";
import { categoryLabel } from "@/lib/format";

type CategoryRow = { id: string; name: string; slug: string; icon: string | null; description: string | null };
type ListPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
};

/** Two full rows at the widest breakpoint, so the first screen is covered. */
const PAGE_SIZE = 12;

/**
 * api/post-meta.js already fetched this to build the server HTML. Reusing it
 * keeps React's first render identical to what was painted, rather than
 * blanking the grid to refetch what is already on screen.
 */
const preloaded = (slug?: string) => {
  const data = window.__PRELOAD__;
  return (data?.category as { slug?: string } | undefined)?.slug === slug ? data : undefined;
};

/** Mirrors categoryPageHref in api/_render.js. */
const pageHref = (slug: string, page: number) =>
  page > 1 ? `/category/${slug}/page/${page}` : `/category/${slug}`;

/**
 * Real links, not a "Load more" button: a crawler never clicks, so the button
 * left every post past the first 12 of a category linked from nowhere.
 * Mirrors renderPagination in api/_render.js.
 */
function CategoryPagination({ slug, page, totalPages }: { slug: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const base = "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-medium";
  const linkClass = `${base} border-border bg-card text-foreground hover:border-primary`;
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link to={pageHref(slug, page - 1)} rel="prev" className={linkClass}>
          ← Prev
        </Link>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
        p === page ? (
          <span key={p} aria-current="page" className={`${base} border-primary bg-primary text-primary-foreground`}>
            {p}
          </span>
        ) : (
          <Link key={p} to={pageHref(slug, p)} className={linkClass}>
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link to={pageHref(slug, page + 1)} rel="next" className={linkClass}>
          Next →
        </Link>
      )}
    </nav>
  );
}

const CategoryPage = () => {
  const { slug, page: pageParam } = useParams<{ slug: string; page?: string }>();
  const page = Math.max(1, Number(pageParam) || 1);
  const seed = preloaded(slug);
  const seedPage = seed && (seed.categoryPage ?? 1) === page ? seed : undefined;

  // The pagination links sit below the grid; land the reader at the top of the new page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    initialData: preloaded(slug)?.category as CategoryRow | undefined,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, icon, description")
        .eq("slug", slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  const { data: pageData } = useQuery({
    queryKey: ["category-posts", category?.id, page],
    // Only the page the server rendered is seeded.
    initialData: seedPage
      ? { posts: seedPage.categoryPosts as ListPost[], total: seedPage.categoryTotal ?? 0 }
      : undefined,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const { data, count } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, cover_image, created_at", { count: "exact" })
        .eq("category_id", category!.id)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      return { posts: (data ?? []) as ListPost[], total: count ?? 0 };
    },
    enabled: !!category?.id,
    placeholderData: (previous) => previous,
  });

  const posts = pageData?.posts ?? [];
  const totalPages = Math.max(1, Math.ceil((pageData?.total ?? 0) / PAGE_SIZE));

  const baseUrl = `${BASE_URL}/category/${slug}`;
  const url = page > 1 ? `${baseUrl}/page/${page}` : baseUrl;
  const baseDescription =
    category?.description ||
    `Browse every ${categoryLabel(category?.name)} review on ${SITE_NAME} — hands-on testing, pricing breakdowns and honest verdicts.`;
  // Must match api/post-meta.js.
  const description = page > 1 ? `Page ${page} of ${totalPages}. ${baseDescription}` : baseDescription;
  const pageSuffix = page > 1 ? ` — Page ${page} of ${totalPages}` : "";

  return (
    <>
      <Seo
        title={`${categoryLabel(category?.name) || "Category"} — Reviews & Comparisons${pageSuffix} | ${SITE_NAME}`}
        description={description}
        canonical={url}
        schema={[
          {
            "@type": "CollectionPage",
            url,
            name: categoryLabel(category?.name) || "Category",
            description,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: categoryLabel(category?.name) || "Category",
                item: baseUrl,
              },
              ...(page > 1
                ? [{ "@type": "ListItem", position: 3, name: `Page ${page}`, item: url }]
                : []),
            ],
          },
        ]}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              {category?.icon && <CategoryIcon name={category.icon} className="h-8 w-8 text-primary" />}
              {categoryLabel(category?.name)}
              {page > 1 && (
                <span className="text-muted-foreground font-medium text-xl md:text-2xl">· Page {page}</span>
              )}
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse all reviews in this category
            </p>
          </div>
          {posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    title={post.title}
                    slug={post.slug}
                    excerpt={post.excerpt}
                    coverImage={post.cover_image}
                    categoryName=""
                    categorySlug={category?.slug ?? ""}
                    createdAt={post.created_at}
                  />
                ))}
              </div>
              {slug && <CategoryPagination slug={slug} page={page} totalPages={totalPages} />}
            </>
          ) : (
            <div className="text-center py-20 rounded-xl border border-border bg-card">
              <p className="text-muted-foreground">No posts in this category yet.</p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CategoryPage;
