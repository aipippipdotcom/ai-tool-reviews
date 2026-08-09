import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Minutes to read, at 200 wpm. Mirrored in api/_render.js. */
export function readingTime(html: string): number {
  const words = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
