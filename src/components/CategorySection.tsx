import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PostCard from "./PostCard";
import CategoryIcon from "./CategoryIcon";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
}

interface CategorySectionProps {
  name: string;
  slug: string;
  icon: string | null;
  posts: Post[];
}

/**
 * Single source of truth for the row size — the column counts below are chosen
 * to divide it evenly, so no breakpoint leaves an orphan card on its own row.
 */
export const POSTS_PER_CATEGORY = 6;

const CategorySection = ({ name, slug, icon, posts }: CategorySectionProps) => {
  if (posts.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground flex items-center gap-2.5">
          <CategoryIcon name={icon} className="h-5 w-5 text-primary" />
          {name}
        </h2>
        <Link
          to={`/category/${slug}`}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 group"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.slice(0, POSTS_PER_CATEGORY).map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            excerpt={post.excerpt}
            coverImage={post.cover_image}
            categoryName={name}
            categorySlug={slug}
            createdAt={post.created_at}
          />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
