import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
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
        <title>AIPipPip - Review Công Cụ AI & Sản Phẩm Số</title>
        <meta
          name="description"
          content="Review chuyên sâu về các công cụ AI, sản phẩm số hàng đầu. So sánh chi tiết giúp bạn chọn đúng tool phù hợp nhu cầu."
        />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
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
