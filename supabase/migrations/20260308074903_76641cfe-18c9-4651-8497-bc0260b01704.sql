
-- Replace overly permissive INSERT policy with one that validates email format
DROP POLICY "Anyone can subscribe" ON public.email_subscribers;

CREATE POLICY "Anyone can subscribe with valid email"
ON public.email_subscribers FOR INSERT
TO anon, authenticated
WITH CHECK (
  email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
);
