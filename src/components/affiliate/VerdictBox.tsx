import AffiliateButton from "./AffiliateButton";
import { Price, Stars } from "./primitives";
import type { ShortcodeAttrs } from "@/lib/shortcodes";

interface VerdictBoxProps {
  attrs: ShortcodeAttrs;
  postSlug?: string;
}

const VerdictBox = ({ attrs, postSlug }: VerdictBoxProps) => (
  <div className="aff-box">
    <p className="aff-box__eyebrow">{attrs.eyebrow || "Our Verdict"}</p>
    <Stars rating={attrs.rating} />
    {attrs.title && <p className="aff-box__title">{attrs.title}</p>}
    {attrs.summary && <p className="aff-box__summary">{attrs.summary}</p>}
    {attrs.url && (
      <div className="aff-box__cta">
        <Price price={attrs.price} was={attrs.was} />
        <AffiliateButton
          url={attrs.url}
          label={attrs.label}
          placement="verdict"
          postSlug={postSlug}
        />
      </div>
    )}
    {attrs.note && <p className="aff-box__note">{attrs.note}</p>}
  </div>
);

export default VerdictBox;
