import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";
import CategoryIcon from "@/components/CategoryIcon";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: category } = useQuery({
    queryKey: ["category", slug],
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

  const { data: posts } = useQuery({
    queryKey: ["category-posts", category?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, cover_image, category_id, created_at, published")
        .eq("category_id", category!.id)
        .eq("published", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!category?.id,
  });

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
          {posts && posts.length > 0 ? (
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
