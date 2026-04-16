import { useState, useRef } from "react";
import { toast } from "sonner";
import { X, Image as ImageIcon } from "lucide-react";

const IMAGEKIT_PRIVATE_KEY = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

const compressImage = (file: File, maxWidth = 1280, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
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

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const CoverImageUpload = ({ value, onChange }: CoverImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }

    try {
      setCompressing(true);
      const compressed = await compressImage(file);
      const originalMB = (file.size / 1024 / 1024).toFixed(1);
      const compressedKB = (compressed.size / 1024).toFixed(0);

      setCompressing(false);
      setUploading(true);

      const safeFileName = sanitizeFileName(file.name).replace(/\.[^.]+$/, "") + ".webp";
      const fileName = `${Date.now()}-${safeFileName}`;

      const fd = new FormData();
      fd.append("file", compressed, fileName);
      fd.append("fileName", fileName);
      fd.append("folder", "/post-images/covers");
      fd.append("useUniqueFileName", "false");

      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(IMAGEKIT_PRIVATE_KEY + ":"),
        },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();
      onChange(data.url);
      toast.success(`Uploaded! (${originalMB}MB → ${compressedKB}KB)`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeCover = () => onChange("");
  const isLoading = uploading || compressing;
  const loadingText = compressing ? "Compressing..." : "Uploading...";

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={value} alt="Cover" className="w-full aspect-video object-cover" />
          <button
            type="button"
            onClick={removeCover}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{loadingText}</p>
          ) : (
            <>
              <div className="p-3 rounded-full bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Upload cover image</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-compressed to WebP • PNG, JPG up to 20MB</p>
              </div>
            </>
          )}
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
};

export default CoverImageUpload;
