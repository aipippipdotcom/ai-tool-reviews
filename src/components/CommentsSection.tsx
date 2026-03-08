import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare, Send } from "lucide-react";

interface CommentsSectionProps {
  postId: string;
}

const CommentsSection = ({ postId }: CommentsSectionProps) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      const trimmedContent = content.trim();
      if (!trimmedName || !trimmedContent) throw new Error("Please fill in all fields");
      if (trimmedName.length > 100) throw new Error("Name must be under 100 characters");
      if (trimmedContent.length > 2000) throw new Error("Content must be under 2000 characters");

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        author_name: trimmedName,
        content: trimmedContent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment posted!");
      setName("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Comments ({comments?.length ?? 0})
      </h2>

      {/* Comment form */}
      <div className="rounded-xl border border-border bg-card p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <Input
            placeholder="Tên của bạn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="sm:max-w-[240px]"
          />
        </div>
        <Textarea
          placeholder="Viết bình luận..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={3}
          className="mb-3"
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !content.trim()}
          size="sm"
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {mutation.isPending ? "Đang gửi..." : "Gửi bình luận"}
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments?.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {comment.author_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">{comment.author_name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
        {comments?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
      </div>
    </section>
  );
};

export default CommentsSection;
