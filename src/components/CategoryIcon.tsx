import {
  Video,
  TrendingUp,
  Palette,
  PenTool,
  Music,
  Bot,
  BookOpen,
  Sparkles,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Static map of the icons categories actually use.
 *
 * This used to go through lucide-react/dynamicIconImports, which emitted ~1400
 * chunks into dist/ and cost an extra request per icon at runtime.
 */
const ICONS: Record<string, LucideIcon> = {
  video: Video,
  "trending-up": TrendingUp,
  palette: Palette,
  "pen-tool": PenTool,
  music: Music,
  bot: Bot,
  "book-open": BookOpen,
  sparkles: Sparkles,
};

const toKebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

interface CategoryIconProps extends Omit<LucideProps, "ref"> {
  name: string | null;
}

const CategoryIcon = ({ name, ...props }: CategoryIconProps) => {
  if (!name) return null;

  const Icon = ICONS[toKebab(name)];
  if (!Icon) return null;

  return <Icon {...props} />;
};

export default CategoryIcon;
