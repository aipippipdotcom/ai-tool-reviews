/**
 * Display helpers for values that read badly straight out of the database.
 */

/**
 * Category rows are named "Review Writing Tools", "Review EBook/PLR" and so on.
 * That prefix belongs to how they were entered, not to how they should read: a
 * section headed "Review Writing Tools" is not a phrase, and the same string is
 * used in breadcrumbs, card labels, page titles and meta descriptions.
 */
export function categoryLabel(name: string | null | undefined): string {
  return String(name || "").replace(/^\s*Review\s+/i, "").trim();
}
