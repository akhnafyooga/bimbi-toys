export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Appends -2, -3, ... until `exists` returns false for the candidate slug.
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
) {
  const baseSlug = slugify(base) || "item";
  let candidate = baseSlug;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n++;
  }
  return candidate;
}
