import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const { data } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt")
      .eq("published", true)
      .ilike("title", `%${value}%`)
      .limit(8);
    setResults(data ?? []);
    setOpen(true);
  };

  const goToPost = (slug: string) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    navigate(`/post/${slug}`);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search AI tool reviews..."
          className="pl-10 bg-secondary/50 border-border focus:bg-background"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => goToPost(r.slug)}
              className="w-full text-left px-4 py-3 hover:bg-secondary/60 transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium text-foreground line-clamp-1">{r.title}</p>
              {r.excerpt && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.excerpt}</p>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg p-4 text-center text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
};

export default SearchBar;
