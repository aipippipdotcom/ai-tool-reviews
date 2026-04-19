import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
import SearchBar from "@/components/SearchBar";
import EmailSubscribe from "@/components/EmailSubscribe";
import { Helmet } from "react-helmet-async";

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
    (posts ?? []).filter((p) => p.category_id === categoryId).slice(0, 5);

  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://aipippip.net" />
        <title>AIPipPip — AI Tool Reviews & Digital Product Comparisons</title>
        <meta
          name="description"
          content="In-depth reviews and comparisons of the best AI tools and digital products. Find the right tool for your workflow."
        />
      </Helmet>
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
