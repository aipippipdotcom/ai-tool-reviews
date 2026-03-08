import { Link } from "react-router-dom";
import { format } from "date-fns";

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
      className="group block bg-card rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="aspect-video bg-muted overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-20" />
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link
            to={`/category/${categorySlug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors"
          >
            {categoryName}
          </Link>
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), "dd/MM/yyyy")}
          </span>
        </div>
        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
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
