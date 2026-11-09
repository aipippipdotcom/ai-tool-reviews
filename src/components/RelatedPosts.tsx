import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/PostCard";
import { pickNeighbours, RELATED_COUNT } from "../../api/_related.js";

interface RelatedPostsProps {
  currentPostId: string;
  currentCreatedAt: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
}

const SELECT = "id, title, slug, excerpt, cover_image, category_id, created_at";

/** The server already picked these for the rendered HTML; reuse them. */
function preloadedRelated(postId: string) {
  const data = window.__PRELOAD__;
  return (data?.post as { id?: string } | undefined)?.id === postId ? data?.related : undefined;
}

const RelatedPosts = ({
  currentPostId,
  currentCreatedAt,
  categoryId,
  categoryName,
  categorySlug,
}: RelatedPostsProps) => {
  const { data: posts } = useQuery({
    queryKey: ["related-posts", currentPostId, categoryId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialData: preloadedRelated(currentPostId) as any[] | undefined,
    // Neighbours by date, not the newest few — see api/_related.js.
    queryFn: async () => {
      const base = () =>
        supabase
          .from("posts")
          .select(SELECT)
          .eq("published", true)
          .eq("category_id", categoryId)
          .neq("id", currentPostId)
          .limit(RELATED_COUNT);
      const [newer, older] = await Promise.all([
        base().gt("created_at", currentCreatedAt).order("created_at", { ascending: true }),
        base().lt("created_at", currentCreatedAt).order("created_at", { ascending: false }),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return pickNeighbours(newer.data ?? [], older.data ?? []) as any[];
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
