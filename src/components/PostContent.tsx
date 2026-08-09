import { useCallback } from "react";
import CtaBox from "@/components/affiliate/CtaBox";
import VerdictBox from "@/components/affiliate/VerdictBox";
import ProsCons from "@/components/affiliate/ProsCons";
import { rewriteExternalLinks, splitList, tokenize } from "@/lib/shortcodes";
import { trackAffiliateClick } from "@/lib/analytics";

/** Must stay identical to PROSE_CLASS in api/_render.js. Styled in index.css. */
const PROSE_CLASS = "article";

interface PostContentProps {
  content: string;
  postSlug?: string;
}

/**
 * Renders post HTML with shortcodes expanded into real conversion components.
 * Prose fragments stay dangerouslySetInnerHTML (that is what the editor
 * produces); affiliate blocks become React so they can be tracked.
 */
const PostContent = ({ content, postSlug }: PostContentProps) => {
  // Inline links live inside dangerouslySetInnerHTML, so tracking is delegated
  // from the wrapper rather than bound per-anchor.
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (e.target as HTMLElement).closest?.(
        'a[data-aff-link="inline"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      trackAffiliateClick({
        url: anchor.href,
        placement: "inline",
        label: anchor.textContent?.trim().slice(0, 60),
        postSlug,
      });
    },
    [postSlug]
  );

  const tokens = tokenize(content || "");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "html") {
      const html = token.value.trim();
      if (!html) continue;
      nodes.push(
        <div
          key={i}
          className={PROSE_CLASS}
          dangerouslySetInnerHTML={{ __html: rewriteExternalLinks(html) }}
        />
      );
    } else if (token.type === "verdict") {
      nodes.push(<VerdictBox key={i} attrs={token.attrs} postSlug={postSlug} />);
    } else if (token.type === "cta") {
      nodes.push(<CtaBox key={i} attrs={token.attrs} postSlug={postSlug} />);
    } else if (token.type === "proscons") {
      nodes.push(
        <ProsCons
          key={i}
          pros={splitList(token.attrs.pros)}
          cons={splitList(token.attrs.cons)}
        />
      );
    } else if (token.type === "pros") {
      // A bare [pros] block pairs with an adjacent [cons] block if there is one.
      const next = tokens[i + 1];
      const nextIsCons = next?.type === "cons";
      nodes.push(
        <ProsCons key={i} pros={token.items} cons={nextIsCons ? next.items : []} />
      );
      if (nextIsCons) i++;
    } else if (token.type === "cons") {
      nodes.push(<ProsCons key={i} pros={[]} cons={token.items} />);
    }
  }

  return <div onClick={onClick}>{nodes}</div>;
};

export default PostContent;
