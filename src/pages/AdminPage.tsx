import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import RichTextEditor from "@/components/RichTextEditor";
import CoverImageUpload from "@/components/CoverImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Pencil, Trash2, Eye, Users } from "lucide-react";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

// Xóa ảnh trên ImageKit bằng cách list files theo path rồi delete theo fileId
const deleteImageFromImageKit = async (imageUrl: string) => {
  if (!imageUrl || !imageUrl.includes("ik.imagekit.io")) return;
  try {
    const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;
    const authHeader = "Basic " + btoa(privateKey + ":");

    // Extract path sau /aipippipdotnet, VD: /post-images/covers/xxx.webp
    const match = imageUrl.match(/ik\.imagekit\.io\/aipippipdotnet(\/.*)/);
    if (!match) return;
    const filePath = match[1];

    // List files theo path
    const searchRes = await fetch(
      `https://api.imagekit.io/v1/files?name=${encodeURIComponent(filePath.split("/").pop()!)}&type=file`,
      { headers: { Authorization: authHeader } }
    );
    const files = await searchRes.json();
    if (!Array.isArray(files) || !files.length) {
      console.warn("ImageKit: file not found at path", filePath);
      return;
    }

    const fileId = files[0].fileId;
    const delRes = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (delRes.ok) {
      console.log("ImageKit: deleted", filePath);
    } else {
      console.error("ImageKit delete failed:", await delRes.text());
    }
  } catch (err) {
    console.error("Failed to delete image from ImageKit:", err);
  }
};

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category_id: string;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  view_count?: number;
  categories?: { name: string } | null;
}

const AdminPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("editor");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [published, setPublished] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug, icon, sort_order").order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, categories(name), view_count")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Post[];
    },
  });

  const { data: subscribers } = useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_subscribers")
        .select("id, title, slug, excerpt, content, cover_image, category_id, author_id, published, created_at, updated_at, meta_title, meta_description, meta_keywords, view_count")
        .order("subscribed_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const postData = {
        title,
        slug: slug || generateSlug(title),
        excerpt: excerpt || null,
        content,
        cover_image: coverImage || null,
        category_id: categoryId,
        author_id: user!.id,
        published,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        meta_keywords: metaKeywords || null,
      };

      if (editingPost) {
        const { error } = await supabase.from("posts").update(postData).eq("id", editingPost);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert(postData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPost ? "Post updated!" : "Post created!");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts-home"] });
      resetForm();
    },
    onError: (err: Error) => {
      toast.error("Error: " + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (post: { id: string; cover_image?: string | null }) => {
      // Xóa ảnh trên ImageKit trước
      if (post.cover_image) {
        await deleteImageFromImageKit(post.cover_image);
      }
      // Xóa post trong DB
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted!");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    },
    onError: (err: Error) => {
      toast.error("Error: " + err.message);
    },
  });

  const resetForm = () => {
    setEditingPost(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setCoverImage("");
    setCategoryId("");
    setPublished(false);
    setMetaTitle("");
    setMetaDescription("");
    setMetaKeywords("");
  };

  const editPost = (post: Post) => {
    setEditingPost(post.id);
    setActiveTab("editor");
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? "");
    setContent(post.content);
    setCoverImage(post.cover_image ?? "");
    setCategoryId(post.category_id);
    setPublished(post.published);
    setMetaTitle(post.meta_title ?? "");
    setMetaDescription(post.meta_description ?? "");
    setMetaKeywords(post.meta_keywords ?? "");
  };

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Dashboard</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="editor" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {editingPost ? "Edit Post" : "New Post"}
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Posts ({posts?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Subscribers ({subscribers?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="max-w-4xl space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 200);
                      setTitle(val);
                      if (!editingPost) setSlug(generateSlug(val));
                    }}
                    required
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{title.length}/200</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Slug (URL)</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block">Cover Image</Label>
                <CoverImageUpload value={coverImage} onChange={setCoverImage} />
              </div>

              <div>
                <Label className="text-muted-foreground">Excerpt</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="bg-secondary border-border" placeholder="Short summary shown on cards..." />
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block">Content *</Label>
                <RichTextEditor content={content} onChange={setContent} />
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-display font-semibold text-sm text-primary uppercase tracking-wider">
                  SEO Settings
                </h3>
                <div>
                  <Label className="text-muted-foreground">Meta Title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO title"
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaTitle.length} chars</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Meta Description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="SEO description"
                    rows={2}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaDescription.length} chars</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Keywords</Label>
                  <Input
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="ai tools, review, digital products"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label className="text-foreground">Publish</Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 glow" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
                </Button>
                {editingPost && (
                  <Button type="button" variant="outline" onClick={resetForm} className="border-border text-muted-foreground hover:text-foreground">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="posts" className="mt-8">
            <div className="space-y-3">
              {posts?.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${post.published ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.categories?.name} · {format(new Date(post.created_at), "MMM d, yyyy")} · 👁 {post.view_count ?? 0} views
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {post.published && (
                      <Link to={`/post/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => editPost(post)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this post?"))
                          deleteMutation.mutate({ id: post.id, cover_image: post.cover_image });
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {!posts?.length && (
                <div className="text-center py-12 rounded-xl border border-border bg-card">
                  <p className="text-muted-foreground">No posts yet. Create your first one!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscribers" className="mt-8">
            <div className="space-y-2">
              {subscribers?.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <span className="text-sm text-foreground">{sub.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(sub.subscribed_at), "MMM d, yyyy 'at' HH:mm")}
                  </span>
                </div>
              ))}
              {!subscribers?.length && (
                <div className="text-center py-12 rounded-xl border border-border bg-card">
                  <p className="text-muted-foreground">No subscribers yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;
