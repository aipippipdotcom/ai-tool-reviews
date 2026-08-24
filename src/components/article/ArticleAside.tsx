import AffiliateButton from "@/components/affiliate/AffiliateButton";
import { Stars } from "@/components/affiliate/primitives";
import type { Heading } from "@/lib/toc";
import type { Offer } from "@/lib/shortcodes";

interface ArticleAsideProps {
  offer: Offer | null;
  rating: number | null;
  headings: Heading[];
  postSlug?: string;
}

/**
 * The desktop sidebar.
 *
 * At 1440px the article column is 736px wide and centred, which left roughly
 * 350px of empty page down each side. On a review site that margin is the most
 * valuable space there is: the offer belongs somewhere a reader can reach it at
 * any scroll depth, which on a phone is the sticky bar and on a desktop was
 * nothing at all.
 *
 * Hidden below xl, where the column already fills the width and the sticky bar
 * takes over.
 */
const ArticleAside = ({ offer, rating, headings, postSlug }: ArticleAsideProps) => {
  if (!offer && headings.length < 3) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-5">
        {offer && (
          <div className="rounded-xl border border-primary/25 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              The verdict
            </p>

            {offer.title && (
              <p className="mt-2 font-display text-base font-bold leading-snug text-foreground">
                {offer.title}
              </p>
            )}

            {rating != null && (
              <div className="mt-2.5">
                <Stars rating={rating} />
              </div>
            )}

            {offer.price && (
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                {offer.price}
              </p>
            )}

            <div className="mt-4">
              <AffiliateButton
                url={offer.url}
                label={offer.label}
                placement="aside"
                postSlug={postSlug}
                size="default"
                block
              />
            </div>
          </div>
        )}

        {headings.length >= 3 && (
          <nav className="rounded-xl border border-border bg-card p-5" aria-label="On this page">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              On this page
            </p>
            <ul className="mt-3 space-y-2">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="block text-[13px] leading-snug text-muted-foreground transition-colors hover:text-primary"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  );
};

export default ArticleAside;
