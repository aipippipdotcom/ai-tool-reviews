/** FTC requires this to be visible before the first affiliate link, not buried. */
export const DISCLOSURE_TEXT =
  "Some links on this page are affiliate links. If you buy through them we may earn a commission at no extra cost to you. This never changes our verdict — we only recommend products we have actually used.";

const AffiliateDisclosure = () => (
  <div className="aff-disclosure">
    <span aria-hidden="true">ⓘ</span>
    <span>{DISCLOSURE_TEXT}</span>
  </div>
);

export default AffiliateDisclosure;
