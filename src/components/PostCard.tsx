import { Link } from "react-router-dom";
import { format } from "date-fns";
import { categoryLabel } from "@/lib/format";

interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryName: string;
  categorySlug: string;
  createdAt: string;
}

const PostCard = ({
  title,
  slug,
  excerpt,
  coverImage,
  categoryName,
  categorySlug,
  createdAt,
}: PostCardProps) => {
  return (
    <Link
      to={`/post/${slug}`}
      className="group block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 hover:glow"
    >
      {/* Covers come from many vendors: white mockups, dark screenshots, red
          thumbnails. A soft fade at the lower edge settles them into the card
          instead of leaving each one shouting its own background. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-1/3 after:bg-gradient-to-t after:from-card after:to-transparent">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-lg">✦</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {categoryName && (
            <>
              <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                {categoryLabel(categoryName)}
              </span>
              <span className="text-border">·</span>
            </>
          )}
          <span className="text-[11px] text-muted-foreground">
            {format(new Date(createdAt), "MMM d, yyyy")}
          </span>
        </div>
        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
          {title}
        </h3>
        {excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
};

export default PostCard;
