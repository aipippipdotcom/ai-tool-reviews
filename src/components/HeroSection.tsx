import { Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import { categoryLabel } from "@/lib/format";

interface HeroSectionProps {
  categories: { id: string; name: string; slug: string }[];
}

/**
 * The masthead, not a hero.
 *
 * What stood here was a badge, a three-line headline, a subhead and a copy of
 * the logo already in the header 100px above: roughly half the first screen on
 * a phone, carrying nothing a visitor could act on. Nobody arrives at a review
 * site to read a positioning statement.
 *
 * So it earns its space instead. Search is the primary tool on a site with
 * hundreds of reviews and was previously orphaned below the fold, and the
 * category row gives the homepage the wayfinding it lacked: seven identical
 * sections stacked to eighteen thousand pixels with no way to skip ahead.
 *
 * No card border either. The masthead speaks, the cards below hold content, and
 * the difference should be visible.
 */
const HeroSection = ({ categories }: HeroSectionProps) => (
  <section className="mb-14 md:mb-16 pt-2 md:pt-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-4">
      Independent reviews · No tool gets a free pass
    </p>

    <h1 className="font-display text-[2rem] md:text-5xl font-bold text-foreground leading-[1.1] tracking-[-0.02em] text-balance max-w-3xl">
      Know what an AI tool really costs{" "}
      <span className="text-gradient">before you pay for it</span>
    </h1>

    <p className="mt-5 text-base md:text-lg leading-relaxed text-muted-foreground max-w-xl text-pretty">
      Hands-on reviews of AI tools and digital products: real pricing, the limits
      the sales page skips, and who should walk away.
    </p>

    <div className="mt-8 max-w-xl">
      <SearchBar />
    </div>

    {categories.length > 0 && (
      <nav className="mt-7 flex flex-wrap gap-2" aria-label="Categories">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {categoryLabel(cat.name)}
          </Link>
        ))}
      </nav>
    )}
  </section>
);

export default HeroSection;
