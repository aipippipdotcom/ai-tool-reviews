import { lazy, Suspense } from "react";
import { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

// Map PascalCase icon names to kebab-case keys
const nameToKebab: Record<string, string> = {
  Video: "video",
  TrendingUp: "trending-up",
  Palette: "palette",
  PenTool: "pen-tool",
  Music: "music",
  Bot: "bot",
  BookOpen: "book-open",
};

interface CategoryIconProps extends Omit<LucideProps, "ref"> {
  name: string | null;
}

const CategoryIcon = ({ name, ...props }: CategoryIconProps) => {
  if (!name) return null;

  const kebab = nameToKebab[name] ?? name.toLowerCase();
  const key = kebab as keyof typeof dynamicIconImports;

  if (!dynamicIconImports[key]) return <span>{name}</span>;

  const LucideIcon = lazy(dynamicIconImports[key]);

  return (
    <Suspense fallback={<div className="w-5 h-5" />}>
      <LucideIcon {...props} />
    </Suspense>
  );
};

export default CategoryIcon;
