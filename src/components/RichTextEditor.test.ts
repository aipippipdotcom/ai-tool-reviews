import { describe, it, expect } from "vitest";
import { generateJSON, generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { tokenize, wrapShortcodeLines } from "@/lib/shortcodes";
import ShortcodeNode from "@/components/editor/ShortcodeNode";

// Must mirror the extension list in RichTextEditor.tsx. Anything the schema
// cannot represent is silently flattened into text rather than rejected, so a
// missing extension shows up as mangled content and nothing else.
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
  Link.configure({ openOnClick: false }),
  Image,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  ShortcodeNode,
];

/**
 * The shape the model actually emits: shortcodes as loose text between
 * paragraphs, not inside one. An earlier fixture wrapped them in <p> by hand
 * and so passed while the real content stayed raw text in the editor.
 */
const GENERATED = `<p>Here is what happened.</p>
[verdict rating="4.1" title="TubeForge" price="$17.00" url="https://warriorplus.com/o2/a/x/0" label="Get TubeForge for $17"]
<p>And then some more prose.</p>
[proscons pros="One-time $17, no subscription|No AI redrawing" cons="No refunds, all sales final|50 render cap"]`;

const TABLE_HTML =
  "<table><thead><tr><th>Option</th><th>Upfront Cost</th></tr></thead>" +
  "<tbody><tr><td>Fiverr</td><td>$25 to $75</td></tr>" +
  "<tr><td>TubeForge</td><td>$17 once</td></tr></tbody></table>";

describe("conversion blocks in the editor", () => {
  const nodeTypes = (html: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((generateJSON(html, extensions) as any).content ?? []).map((n: any) => n.type);

  // The regression: bare shortcode lines stayed as raw bracket text on screen.
  it("recognises bare shortcode lines as conversion blocks", () => {
    expect(nodeTypes(wrapShortcodeLines(GENERATED))).toEqual([
      "paragraph",
      "shortcodeBlock",
      "paragraph",
      "shortcodeBlock",
    ]);
  });

  it("does not recognise them without the wrapping step", () => {
    expect(nodeTypes(GENERATED)).not.toContain("shortcodeBlock");
  });

  it("keeps the attributes intact through the wrap", () => {
    const json = generateJSON(wrapShortcodeLines(GENERATED), extensions) as any;
    const block = json.content.find((n: any) => n.type === "shortcodeBlock");

    expect(tokenize(block.attrs.code)[0]).toMatchObject({
      type: "verdict",
      attrs: { rating: "4.1", title: "TubeForge", price: "$17.00" },
    });
  });

  it("leaves a shortcode that shares a line with prose alone", () => {
    const html = '<p>Here it is. [verdict rating="4"]</p>';
    expect(nodeTypes(wrapShortcodeLines(html))).toEqual(["paragraph"]);
  });
});

describe("editor schema", () => {
  it("keeps a generated comparison table as a real table", () => {
    const html = generateHTML(generateJSON(TABLE_HTML, extensions), extensions);

    expect(html).toContain("<table");
    expect(html).toContain("<td");
    // The failure mode being guarded against: cells concatenated into prose.
    expect(html).not.toContain("OptionUpfront Cost");
  });

  it("preserves every cell value", () => {
    const html = generateHTML(generateJSON(TABLE_HTML, extensions), extensions);

    for (const cell of ["Option", "Fiverr", "$25 to $75", "TubeForge", "$17 once"]) {
      expect(html).toContain(cell);
    }
  });

  /**
   * A shortcode is stored as text, so the editor escapes its quotes. This is
   * correct HTML but it broke attribute parsing, which silently emptied every
   * conversion block on the published page — including the buy button.
   */
  it("escapes shortcode quotes, and the parser still reads them", () => {
    const stored = generateHTML(
      generateJSON('<p>[proscons pros="A|B" cons="C"]</p>', extensions),
      extensions
    );

    expect(stored).toContain("&quot;");

    const tokens = tokenize(stored);
    expect(tokens).toContainEqual({
      type: "proscons",
      attrs: { pros: "A|B", cons: "C" },
    });
  });

  it("survives a round trip through the editor for a verdict block", () => {
    const source =
      '<p>[verdict rating="4.3" title="TubeForge" url="https://m.com/x" price="$17"]</p>';
    const stored = generateHTML(generateJSON(source, extensions), extensions);

    const verdict = tokenize(stored).find((t) => t.type === "verdict");
    expect(verdict).toMatchObject({
      attrs: {
        rating: "4.3",
        title: "TubeForge",
        url: "https://m.com/x",
        price: "$17",
      },
    });
  });
});
