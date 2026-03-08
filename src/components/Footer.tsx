import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const categories = [
  { name: "Video/Image Tools", slug: "video-image-tools" },
  { name: "Marketing Tools", slug: "marketing-tools" },
  { name: "Design/Code Tools", slug: "design-code-tools" },
  { name: "Writing Tools", slug: "writing-tools" },
  { name: "Voice/Music Tools", slug: "voice-music-tools" },
  { name: "Assistance Tools", slug: "assistance-tools" },
  { name: "EBook/PLR", slug: "ebook-plr" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border mt-20">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="AIPipPip" className="h-7 w-7 rounded-lg" />
              <span className="font-display text-lg font-bold text-gradient">
                AIPipPip
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              In-depth reviews & comparisons of the best AI tools and digital products. Find the right tool, save time and money.
            </p>
          </div>

          <div className="md:col-span-4">
            <h4 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {categories.map((cat) => (
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

          <div className="md:col-span-4">
            <h4 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider mb-4">
              About
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              AIPipPip helps creators, marketers, and developers discover the best AI-powered tools through honest, detailed reviews.
            </p>
            <Link to="/about" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              Learn more about us →
            </Link>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AIPipPip. All rights reserved.
          </p>
          <Link
            to="/login"
            className="text-destructive hover:text-destructive/80 transition-colors text-sm font-bold select-none"
            aria-label="Admin"
          >
            •
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
