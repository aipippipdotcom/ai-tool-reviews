import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

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
      return data;
    },
    enabled: !!slug,
  });

  const category = post?.categories as { name: string; slug: string; icon: string } | null;

  return (
    <>
      <Helmet>
        <title>{post?.meta_title || post?.title || "Bài viết"} - AIPipPip</title>
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
        <main className="flex-1 container mx-auto px-4 py-8">
          {post ? (
            <article className="max-w-3xl mx-auto">
              <Link
                to={category ? `/category/${category.slug}` : "/"}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {category?.name ?? "Trang chủ"}
              </Link>

              {post.cover_image && (
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full rounded-xl mb-8 aspect-video object-cover"
                />
              )}

              <div className="flex items-center gap-2 mb-4">
                {category && (
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {category.icon} {category.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(post.created_at), "dd/MM/yyyy")}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                {post.title}
              </h1>

              <div
                className="prose prose-lg max-w-none text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PostPage;
