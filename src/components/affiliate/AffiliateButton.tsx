import { trackAffiliateClick } from "@/lib/analytics";

interface AffiliateButtonProps {
  url: string;
  label?: string;
  /** Where on the page this button sits — the key dimension when comparing CTAs. */
  placement: string;
  postSlug?: string;
  size?: "default" | "lg";
  block?: boolean;
}

const AffiliateButton = ({
  url,
  label = "Get It Now",
  placement,
  postSlug,
  size = "lg",
  block = false,
}: AffiliateButtonProps) => (
  <a
    className={[
      "aff-btn",
      size === "lg" && "aff-btn--lg",
      block && "aff-btn--block",
    ]
      .filter(Boolean)
      .join(" ")}
    href={url}
    target="_blank"
    rel="sponsored nofollow noopener noreferrer"
    data-aff-link={placement}
    onClick={() => trackAffiliateClick({ url, placement, label, postSlug })}
  >
    {label} <span aria-hidden="true">→</span>
  </a>
);

export default AffiliateButton;
