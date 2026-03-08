import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="font-display text-xl font-bold text-gradient-primary">
              AIPipPip
            </span>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Review chuyên sâu về các công cụ AI và sản phẩm số hàng đầu. Giúp bạn chọn đúng tool, tiết kiệm thời gian và chi phí.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Danh mục</h4>
            <ul className="space-y-2">
              {[
                { name: "Video/Image Tools", slug: "video-image-tools" },
                { name: "Marketing Tools", slug: "marketing-tools" },
                { name: "Design/Code Tools", slug: "design-code-tools" },
                { name: "Writing Tools", slug: "writing-tools" },
              ].map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Thêm</h4>
            <ul className="space-y-2">
              {[
                { name: "Voice/Music Tools", slug: "voice-music-tools" },
                { name: "Assistance Tools", slug: "assistance-tools" },
                { name: "EBook/PLR", slug: "ebook-plr" },
              ].map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AIPipPip. All rights reserved.
          </p>
          {/* Subtle admin login link */}
          <Link
            to="/login"
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
            aria-label="Admin"
          >
            ·
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
