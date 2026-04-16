import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Image as ImageIcon } from "lucide-react";

const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/aipippipdotnet";
const IMAGEKIT_PUBLIC_KEY = "public_A2mRaWx/5MXyfDcJVmivMP4UMss=";

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const CoverImageUpload = ({ value, onChange }: CoverImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setUploading(true);

    try {
      const safeFileName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}-${safeFileName}`;

      // Lấy auth signature từ ImageKit
      const authRes = await fetch(
        `https://upload.imagekit.io/api/v1/files/upload`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              btoa(import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY + ":"),
          },
          body: (() => {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("fileName", fileName);
            fd.append("folder", "/post-images/covers");
            fd.append("useUniqueFileName", "false");
            return fd;
          })(),
        }
      );

      if (!authRes.ok) {
        const err = await authRes.json();
        throw new Error(err.message || "Upload failed");
      }

      const data = await authRes.json();
      onChange(data.url);
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeCover = () => onChange("");

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img
            src={value}
            alt="Cover"
            className="w-full aspect-video object-cover"
          />
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
          disabled={uploading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
        >
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          ) : (
            <>
              <div className="p-3 rounded-full bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Upload cover image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

export default CoverImageUpload;
