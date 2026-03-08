import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/PostCard";

interface RelatedPostsProps {
  currentPostId: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
}

const RelatedPosts = ({ currentPostId, categoryId, categoryName, categorySlug }: RelatedPostsProps) => {
  const { data: posts } = useQuery({
    queryKey: ["related-posts", currentPostId, categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .eq("category_id", categoryId)
        .neq("id", currentPostId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (!posts?.length) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6">Related Posts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            excerpt={post.excerpt}
            coverImage={post.cover_image}
            categoryName={categoryName}
            categorySlug={categorySlug}
            createdAt={post.created_at}
          />
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;
