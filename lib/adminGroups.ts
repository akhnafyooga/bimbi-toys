// The admin panel groups the catalog's many categories into three sections the
// store owner actually thinks in: Mainan, Alat Tulis, and everything else.
//
// Matching is keyword-based on the category name so both the seeded categories
// ("Action Figure", "Board Game") and the imported ones ("Mainan Edukasi &
// Kreatif", "Mobil & Kendaraan") land in the right place without a schema change.

export const ADMIN_GROUPS = ["Mainan", "Alat Tulis", "Lainnya"] as const;
export type AdminGroup = (typeof ADMIN_GROUPS)[number];

const TOY_KEYWORDS = [
  "mainan", "boneka", "mobil", "kendaraan", "diecast", "rc", "action figure",
  "board game", "puzzle", "lego", "outdoor", "sport", "olahraga", "bayi",
  "balon", "pesta", "edukasi", "figure",
];

export function groupOfCategory(name: string): AdminGroup {
  const n = name.toLowerCase();
  if (n.includes("alat tulis")) return "Alat Tulis";
  if (TOY_KEYWORDS.some((k) => n.includes(k))) return "Mainan";
  return "Lainnya";
}

/** Split categories into the three admin sections, preserving input order. */
export function groupCategories<T extends { name: string }>(
  categories: T[]
): Record<AdminGroup, T[]> {
  const out: Record<AdminGroup, T[]> = { Mainan: [], "Alat Tulis": [], Lainnya: [] };
  for (const c of categories) out[groupOfCategory(c.name)].push(c);
  return out;
}
