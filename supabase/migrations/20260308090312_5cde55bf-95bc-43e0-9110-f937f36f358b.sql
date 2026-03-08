
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (
  char_length(author_name) > 0 AND char_length(author_name) <= 100 AND
  char_length(content) > 0 AND char_length(content) <= 2000
);
CREATE POLICY "Admins can delete comments" ON public.comments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
