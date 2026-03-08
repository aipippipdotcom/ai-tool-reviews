import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const CategoriesPage = () => {
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

  return (
    <>
      <Helmet>
        <title>Danh mục - AIPipPip</title>
        <meta name="description" content="Tất cả danh mục review công cụ AI và sản phẩm số trên AIPipPip" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Tất cả danh mục
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group p-6 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-border hover:border-primary/30"
              >
                <span className="text-4xl mb-3 block">{cat.icon}</span>
                <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CategoriesPage;
