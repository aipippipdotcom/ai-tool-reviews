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
        .select("*")
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["posts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const getPostsForCategory = (categoryId: string) =>
    (posts ?? []).filter((p) => p.category_id === categoryId).slice(0, 5);

  return (
    <>
      <Helmet>
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
