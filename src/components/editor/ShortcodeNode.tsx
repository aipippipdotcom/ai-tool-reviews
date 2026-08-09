import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useState } from "react";
import VerdictBox from "@/components/affiliate/VerdictBox";
import CtaBox from "@/components/affiliate/CtaBox";
import ProsCons from "@/components/affiliate/ProsCons";
import { splitList, tokenize } from "@/lib/shortcodes";
import { Pencil, Check, X } from "lucide-react";

/** A paragraph made up only of shortcodes, and nothing else. */
const ONLY_SHORTCODES = /^(?:\s*\[(?:cta|verdict|proscons)\b[^\]]*\]\s*)+$/i;

/**
 * Renders the conversion block the way the published page will, inside the
 * editor.
 *
 * Storage is unchanged: the node parses from and serialises back to an ordinary
 * paragraph of shortcode text, so nothing about the database format moves. Only
 * the editing surface changes, because bracketed source read as broken output
 * rather than as a configured block.
 */
const ShortcodeView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const code = String(node.attrs.code || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);

  const blocks = tokenize(code).filter((t) => t.type !== "html");

  const save = () => {
    updateAttributes({ code: draft.trim() });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(code);
    setEditing(false);
  };

  return (
    <NodeViewWrapper className="sc-node" data-editing={editing}>
      <div className="sc-node__bar" contentEditable={false}>
        <span className="sc-node__label">Conversion block</span>
        {editor.isEditable &&
          (editing ? (
            <span className="sc-node__actions">
              <button type="button" onClick={save} title="Save">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={cancel} title="Cancel">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="sc-node__edit"
              onClick={() => {
                setDraft(code);
                setEditing(true);
              }}
              title="Edit this block"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          ))}
      </div>

      {editing ? (
        <textarea
          className="sc-node__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(14, Math.max(4, draft.split("\n").length + 3))}
          spellCheck={false}
          autoFocus
        />
      ) : (
        <div className="sc-node__preview" contentEditable={false}>
          {blocks.map((token, i) => {
            if (token.type === "verdict") return <VerdictBox key={i} attrs={token.attrs} />;
            if (token.type === "cta") return <CtaBox key={i} attrs={token.attrs} />;
            if (token.type === "proscons") {
              return (
                <ProsCons
                  key={i}
                  pros={splitList(token.attrs.pros)}
                  cons={splitList(token.attrs.cons)}
                />
              );
            }
            return null;
          })}
          {blocks.length === 0 && (
            <p className="sc-node__empty">
              This block has no valid shortcode yet. Click Edit to fix it.
            </p>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ShortcodeNode = Node.create({
  name: "shortcodeBlock",
  group: "block",
  atom: true,
  selectable: true,
  // Must beat Paragraph to the same <p> tag.
  priority: 1200,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p",
        getAttrs: (element) => {
          const text = (element as HTMLElement).textContent?.trim() ?? "";
          return ONLY_SHORTCODES.test(text) ? { code: text } : false;
        },
      },
    ];
  },

  // Serialised back to exactly what it parsed from, so the stored format and
  // every existing post stay untouched.
  renderHTML({ HTMLAttributes, node }) {
    return ["p", mergeAttributes(HTMLAttributes), String(node.attrs.code || "")];
  },

  renderText({ node }) {
    return String(node.attrs.code || "");
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShortcodeView);
  },
});

export default ShortcodeNode;
