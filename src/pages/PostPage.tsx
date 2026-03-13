import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RelatedPosts from "@/components/RelatedPosts";
import CommentsSection from "@/components/CommentsSection";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import CategoryIcon from "@/components/CategoryIcon";

const PostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, categories(name, slug, icon)")
        .eq("slug", slug!)
        .eq("published", true)
        .single();

      if (data) {
        await supabase.rpc("increment_view_count", { post_slug: slug });
      }

      return data;
    },
    enabled: !!slug,
  });

  const category = post?.categories as { name: string; slug: string; icon: string } | null;

  return (
    <>
      <Helmet>
        <title>{post?.meta_title || post?.title || "Article"} — AIPipPip</title>
        <meta
          name="description"
          content={post?.meta_description || post?.excerpt || ""}
        />
        {post?.meta_keywords && (
          <meta name="keywords" content={post.meta_keywords} />
        )}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post?.title,
            description: post?.meta_description || post?.excerpt,
            datePublished: post?.created_at,
            dateModified: post?.updated_at,
            publisher: {
              "@type": "Organization",
              name: "AIPipPip",
            },
          })}
        </script>
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          {post ? (
            <article className="max-w-3xl mx-auto">
              <Link
                to={category ? `/category/${category.slug}` : "/"}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {category?.name ?? "Home"}
              </Link>

              {post.cover_image && (
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full rounded-xl mb-8 aspect-video object-cover border border-border"
                />
              )}

              <div className="flex items-center gap-3 mb-5">
                {category && (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                    <CategoryIcon name={category.icon} className="h-3.5 w-3.5 text-primary inline mr-1" /> {category.name}
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

              <div
                className="prose prose-invert prose-lg max-w-none leading-relaxed [&_h2]:font-display [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-foreground [&_p]:text-white [&_a]:text-blue-400 [&_strong]:text-foreground [&_li]:text-white"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Related posts */}
              {category && (
                <RelatedPosts
                  currentPostId={post.id}
                  categoryId={post.category_id}
                  categoryName={category.name}
                  categorySlug={category.slug}
                />
              )}

              {/* Comments */}
              <CommentsSection postId={post.id} />
            </article>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PostPage;
