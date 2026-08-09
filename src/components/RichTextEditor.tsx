import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Code,
  Award,
  MousePointerClick,
  Columns2,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const ToolbarButton = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${
      active
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

/**
 * Conversion blocks are stored as plain-text shortcodes in the post body and
 * expanded at render time by PostContent / api/_render.js. Keeping them as text
 * means the 370 existing posts need no migration.
 */
const SHORTCODE_TEMPLATES = {
  verdict:
    '[verdict rating="4.5" title="Product Name" summary="One-sentence verdict a skimmer can act on." price="$9.95" was="$29" url="https://affiliate-link" label="Get It Now" note="Instant download · 30-day money-back guarantee"]',
  cta: '[cta title="Ready to try it?" price="$9.95" url="https://affiliate-link" label="Get It Now" note="Instant access"]',
  proscons:
    '[proscons pros="First upside|Second upside|Third upside" cons="First downside|Second downside"]',
};

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

// Compress ảnh trước khi upload
const compressImage = (file: File | Blob, maxWidth = 1280, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", quality);
    };
    img.src = url;
  });
};

// Upload ảnh lên ImageKit
const uploadToImageKit = async (blob: Blob, fileName: string): Promise<string> => {
  const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;
  const fd = new FormData();
  fd.append("file", blob, fileName);
  fd.append("fileName", fileName);
  fd.append("folder", "/post-images/content");
  fd.append("useUniqueFileName", "false");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(privateKey + ":"),
    },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Upload failed");
  }

  const data = await res.json();
  return data.url;
};

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your review..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[400px] p-4 focus:outline-none prose prose-invert max-w-none [&_h1]:font-display [&_h1]:text-3xl [&_h2]:font-display [&_h2]:text-2xl [&_h3]:font-display [&_h3]:text-xl [&_h4]:font-display [&_h4]:text-lg [&_h5]:font-display [&_h5]:text-base [&_p]:text-muted-foreground [&_a]:text-primary [&_strong]:text-foreground [&_li]:text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_h5]:text-foreground [&_blockquote]:border-primary/30 [&_blockquote]:text-muted-foreground [&_code]:bg-secondary [&_code]:text-primary [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6",
      },
      // Xử lý paste ảnh
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            const toastId = toast.loading("Compressing & uploading image...");
            compressImage(file)
              .then((compressed) => {
                const fileName = `${Date.now()}-pasted.webp`;
                return uploadToImageKit(compressed, fileName);
              })
              .then((url) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                );
                toast.success("Image uploaded!", { id: toastId });
              })
              .catch((err) => {
                toast.error("Upload failed: " + err.message, { id: toastId });
              });

            return true;
          }
        }
        return false;
      },

      // Xử lý drop ảnh vào editor
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const file = files[0];
        if (!file.type.startsWith("image/")) return false;

        event.preventDefault();
        const toastId = toast.loading("Compressing & uploading image...");

        compressImage(file)
          .then((compressed) => {
            const fileName = `${Date.now()}-${sanitizeFileName(file.name).replace(/\.[^.]+$/, "")}.webp`;
            return uploadToImageKit(compressed, fileName);
          })
          .then((url) => {
            const { tr, schema } = view.state;
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? tr.selection.from;
            view.dispatch(tr.insert(pos, schema.nodes.image.create({ src: url })));
            toast.success("Image uploaded!", { id: toastId });
          })
          .catch((err) => {
            toast.error("Upload failed: " + err.message, { id: toastId });
          });

        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = prompt("Enter URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const insertShortcode = useCallback(
    (kind: keyof typeof SHORTCODE_TEMPLATES) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [{ type: "text", text: SHORTCODE_TEMPLATES[kind] }],
        })
        .run();
    },
    [editor]
  );

  // Upload ảnh từ toolbar button
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const toastId = toast.loading("Compressing & uploading...");
      try {
        const compressed = await compressImage(file);
        const fileName = `${Date.now()}-${sanitizeFileName(file.name).replace(/\.[^.]+$/, "")}.webp`;
        const url = await uploadToImageKit(compressed, fileName);
        editor.chain().focus().setImage({ src: url }).run();
        toast.success("Image inserted!", { id: toastId });
      } catch (err: any) {
        toast.error("Upload failed: " + err.message, { id: toastId });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  if (!editor) return null;

  const s = 15;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden relative">
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-secondary/50 sticky top-0 z-10">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="Heading 4">
          <Heading4 size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()} active={editor.isActive("heading", { level: 5 })} title="Heading 5">
          <Heading5 size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
          <ListOrdered size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Add Link">
          <LinkIcon size={s} />
        </ToolbarButton>
        {editor.isActive("link") && (
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
            <Unlink size={s} />
          </ToolbarButton>
        )}
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert Image">
          <ImageIcon size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => insertShortcode("verdict")} title="Insert Verdict box (rating + price + CTA)">
          <Award size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => insertShortcode("cta")} title="Insert CTA button block">
          <MousePointerClick size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => insertShortcode("proscons")} title="Insert Pros / Cons block">
          <Columns2 size={s} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={s} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={s} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default RichTextEditor;
