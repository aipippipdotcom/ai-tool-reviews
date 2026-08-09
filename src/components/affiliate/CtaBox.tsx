import AffiliateButton from "./AffiliateButton";
import { Price } from "./primitives";
import type { ShortcodeAttrs } from "@/lib/shortcodes";

interface CtaBoxProps {
  attrs: ShortcodeAttrs;
  postSlug?: string;
  placement?: string;
}

const CtaBox = ({ attrs, postSlug, placement = "cta" }: CtaBoxProps) => {
  if (!attrs.url) return null;

  return (
    <div className="aff-box">
      {attrs.eyebrow && <p className="aff-box__eyebrow">{attrs.eyebrow}</p>}
      {attrs.title && <p className="aff-box__title">{attrs.title}</p>}
      {attrs.summary && <p className="aff-box__summary">{attrs.summary}</p>}
      <div className="aff-box__cta">
        <Price price={attrs.price} was={attrs.was} />
        <AffiliateButton
          url={attrs.url}
          label={attrs.label}
          placement={placement}
          postSlug={postSlug}
        />
      </div>
      {attrs.note && <p className="aff-box__note">{attrs.note}</p>}
    </div>
  );
};

export default CtaBox;
