import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import CategoryIcon from "@/components/CategoryIcon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";

const CategoriesPage = () => {
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

  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://aipippip.net/categories" />
        <title>All Categories — AIPipPip</title>
        <meta name="description" content="Browse all AI tool review categories on AIPipPip" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-10">
            All Categories
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:glow transition-all duration-300"
              >
                <CategoryIcon name={cat.icon} className="h-7 w-7 text-primary" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </h2>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
