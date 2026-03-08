import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
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

const AdminPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState<string | null>(null);
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
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: subscribers } = useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      return data ?? [];
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted!");
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
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

  const editPost = (post: any) => {
    setEditingPost(post.id);
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

        <Tabs defaultValue="editor">
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
              className="max-w-3xl space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editingPost) setSlug(generateSlug(e.target.value));
                    }}
                    required
                    className="bg-secondary border-border"
                  />
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
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-muted-foreground">Excerpt</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="bg-secondary border-border" />
              </div>

              <div>
                <Label className="text-muted-foreground">Content (HTML) *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  required
                  className="font-mono text-sm bg-secondary border-border"
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Cover Image URL</Label>
                <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="bg-secondary border-border" />
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
                    placeholder="SEO title (max 60 chars)"
                    maxLength={60}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Meta Description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="SEO description (max 160 chars)"
                    maxLength={160}
                    rows={2}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160</p>
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
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          post.published
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(post.categories as any)?.name} · {format(new Date(post.created_at), "MMM d, yyyy")}
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
                        if (confirm("Delete this post?")) deleteMutation.mutate(post.id);
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
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                >
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
