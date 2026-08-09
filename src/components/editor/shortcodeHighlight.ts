import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Conversion blocks are stored as plain-text shortcodes, which the editor has
 * no reason to treat as special — so they render as a wall of bracketed text
 * that reads like broken output rather than a configured block.
 *
 * This decorates any paragraph that is entirely one shortcode, labelling what
 * it will become on the published page. Decorations are presentational only:
 * the text stays ordinary and editable, so values can still be tweaked in
 * place, and nothing changes in what gets saved.
 */
const SHORTCODE_START = /^\[(cta|verdict|proscons|pros|cons)\b/i;

const LABELS: Record<string, string> = {
  verdict: "Verdict box",
  cta: "Call to action",
  proscons: "Pros and cons",
  pros: "Pros",
  cons: "Cons",
};

export const ShortcodeHighlight = Extension.create({
  name: "shortcodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("shortcodeHighlight"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return;

              const match = node.textContent.trim().match(SHORTCODE_START);
              if (!match) return;

              const kind = match[1].toLowerCase();
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: "shortcode-block",
                  "data-shortcode-label": LABELS[kind] ?? kind,
                })
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default ShortcodeHighlight;
