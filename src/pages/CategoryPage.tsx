import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";
import CategoryIcon from "@/components/CategoryIcon";

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

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    initialData: preloaded(slug)?.category as any,
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

  // Paged rather than unbounded: a category with 100 posts used to ship all of
  // them on first paint, when a visitor sees at most a couple of rows.
  const [page, setPage] = useState(0);

  const { data: pages } = useQuery({
    queryKey: ["category-posts", category?.id, page],
    // Only the first page was rendered server-side.
    initialData: page === 0 ? (preloaded(slug)?.categoryPosts as any[] | undefined) : undefined,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, cover_image, created_at")
        .eq("category_id", category!.id)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .range(0, (page + 1) * PAGE_SIZE - 1);
      return (data ?? []) as any[];
    },
    enabled: !!category?.id,
    placeholderData: (previous) => previous,
  });

  const posts = pages ?? [];
  const hasMore = posts.length === (page + 1) * PAGE_SIZE;

  const url = `${BASE_URL}/category/${slug}`;
  const description =
    category?.description ||
    `Browse every ${category?.name ?? ""} review on ${SITE_NAME} — hands-on testing, pricing breakdowns and honest verdicts.`;

  return (
    <>
      <Seo
        title={`${category?.name ?? "Category"} — Reviews & Comparisons | ${SITE_NAME}`}
        description={description}
        canonical={url}
        schema={[
          {
            "@type": "CollectionPage",
            url,
            name: category?.name ?? "Category",
            description,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: category?.name ?? "Category",
                item: url,
              },
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
              {category?.name}
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
                    categoryName={category?.name ?? ""}
                    categorySlug={category?.slug ?? ""}
                    createdAt={post.created_at}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    className="border-border"
                  >
                    Load more reviews
                  </Button>
                </div>
              )}
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
