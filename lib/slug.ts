/**
 * Normalize a string into a lowercase URL-safe slug capped at maxLen chars.
 */
export function slugify(input: string, maxLen = 64): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  return normalized || "item";
}

/**
 * Build a base slug "<slugified-name>-<yyyy-mm-dd>", avoiding duplicating the date
 * if the name already ends with that date (e.g. "Game day 2026-11-22").
 */
export function buildBaseSlug(name: string, dateStr: string): string {
  const base = slugify(name, 60);
  if (dateStr && base.endsWith(dateStr)) {
    return base;
  }
  return dateStr ? `${base}-${dateStr}` : base;
}

/**
 * Given existing slugs sharing the same prefix, return `base` or `base-2`, `base-3`, etc.
 */
export function pickUniqueSlug(
  base: string,
  existingSlugs: readonly string[],
): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }
  return `${base}-${suffix}`;
}
