import { useEffect, useRef, useState } from "react";
import AffiliateButton from "./AffiliateButton";
import { track } from "@/lib/analytics";
import type { Offer } from "@/lib/shortcodes";

interface StickyCtaProps {
  offer: Offer | null;
  postSlug?: string;
}

/**
 * Mobile-only bar. Most traffic is mobile and readers rarely scroll back up to
 * an in-article CTA, so the offer follows them down the page.
 */
const StickyCta = ({ offer, postSlug }: StickyCtaProps) => {
  const [visible, setVisible] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    if (!offer) return;

    const onScroll = () => {
      // Wait until the reader is actually engaged — showing it instantly
      // trains people to dismiss it.
      const show = window.scrollY > 700;
      setVisible(show);
      if (show && !seen.current) {
        seen.current = true;
        track("sticky_cta_shown", { post: postSlug });
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offer, postSlug]);

  if (!offer) return null;

  return (
    <div className="aff-sticky" data-visible={visible} aria-hidden={!visible}>
      <div className="aff-sticky__meta">
        {offer.title && <span className="aff-sticky__title">{offer.title}</span>}
        {offer.price && <span className="aff-sticky__price">{offer.price}</span>}
      </div>
      <AffiliateButton
        url={offer.url}
        label={offer.label}
        placement="sticky"
        postSlug={postSlug}
        size="default"
      />
    </div>
  );
};

export default StickyCta;
