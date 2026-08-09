import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategorySection, { POSTS_PER_CATEGORY } from "@/components/CategorySection";
import SearchBar from "@/components/SearchBar";
import EmailSubscribe from "@/components/EmailSubscribe";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";

const Index = () => {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, icon, description, sort_order")
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["posts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, cover_image, category_id, created_at, published")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const getPostsForCategory = (categoryId: string) =>
    (posts ?? []).filter((p) => p.category_id === categoryId).slice(0, POSTS_PER_CATEGORY);

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
          <HeroSection />
          <div className="my-8">
            <SearchBar />
          </div>
          {(categories ?? []).map((cat) => (
            <CategorySection
              key={cat.id}
              name={cat.name}
              slug={cat.slug}
              icon={cat.icon}
              posts={getPostsForCategory(cat.id)}
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
