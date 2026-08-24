import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategorySection, { POSTS_PER_CATEGORY } from "@/components/CategorySection";
import EmailSubscribe from "@/components/EmailSubscribe";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";

/**
 * api/post-meta.js already fetched this to build the server HTML. Reusing it
 * means React's first render matches what was painted, instead of blanking the
 * page while it refetches what is already on screen.
 */
const preloaded = () => window.__PRELOAD__;

const Index = () => {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    initialData: preloaded()?.categories as any[] | undefined,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, icon, description, sort_order")
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  /**
   * One bounded query per category rather than one unbounded query for the
   * whole site.
   *
   * The page shows six posts per category but used to download every published
   * post and discard the rest client-side: 177KB of Supabase egress on every
   * visit to render 26KB of content. The queries run in parallel, so this costs
   * no extra wall-clock.
   */
  const postQueries = useQueries({
    queries: (categories ?? []).map((cat: any) => ({
      queryKey: ["home-category-posts", cat.id, POSTS_PER_CATEGORY],
      initialData: preloaded()?.homePosts?.[cat.id] as any[] | undefined,
      queryFn: async () => {
        const { data } = await supabase
          .from("posts")
          .select("id, title, slug, excerpt, cover_image, created_at")
          .eq("published", true)
          .eq("category_id", cat.id)
          .order("created_at", { ascending: false })
          .limit(POSTS_PER_CATEGORY);
        return data ?? [];
      },
    })),
  });

  return (
    <>
      <Seo
        title="AIPipPip — Best AI Tools Reviews & Comparisons"
        description="Discover and compare the best AI tools. In-depth reviews, tutorials, and the latest updates on artificial intelligence tools."
        canonical={BASE_URL}
        schema={[
          {
            "@type": "WebSite",
            url: BASE_URL,
            name: SITE_NAME,
            potentialAction: {
              "@type": "SearchAction",
              target: `${BASE_URL}/?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "Organization",
            name: SITE_NAME,
            url: BASE_URL,
            logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.png` },
          },
        ]}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <HeroSection categories={categories ?? []} />
          {(categories ?? []).map((cat, i) => (
            <CategorySection
              key={cat.id}
              name={cat.name}
              slug={cat.slug}
              icon={cat.icon}
              posts={(postQueries[i]?.data ?? []) as any[]}
            />
          ))}
          <EmailSubscribe />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
