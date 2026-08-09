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
import { tokenize } from "@/lib/shortcodes";

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
];

const TABLE_HTML =
  "<table><thead><tr><th>Option</th><th>Upfront Cost</th></tr></thead>" +
  "<tbody><tr><td>Fiverr</td><td>$25 to $75</td></tr>" +
  "<tr><td>TubeForge</td><td>$17 once</td></tr></tbody></table>";

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
