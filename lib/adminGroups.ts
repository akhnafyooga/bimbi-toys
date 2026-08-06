// The admin panel groups the catalog's many categories into the sections the
// store owner actually thinks in. "Mainan & Lainnya" is one group: toys and the
// odds-and-ends are stocked and browsed together, and splitting them left the
// old "Lainnya" section as a confusing dumping ground.
//
// The storefront's "Mau cari apa?" banners use this SAME classifier, so the two
// can never drift apart.
//
// Matching is keyword-based on the category name so both the seeded categories
// ("Action Figure", "Board Game") and the imported ones ("Mainan Edukasi &
// Kreatif", "Mobil & Kendaraan") land in the right place without a schema change.

export const ADMIN_GROUPS = ["Mainan & Lainnya", "Alat Tulis"] as const;
export type AdminGroup = (typeof ADMIN_GROUPS)[number];

export function groupOfCategory(name: string): AdminGroup {
  // Only stationery splits off; everything else — toys and the long tail —
  // belongs to the single combined group.
  return name.toLowerCase().includes("alat tulis") ? "Alat Tulis" : "Mainan & Lainnya";
}

/** Split categories into the admin sections, preserving input order. */
export function groupCategories<T extends { name: string }>(
  categories: T[]
): Record<AdminGroup, T[]> {
  const out: Record<AdminGroup, T[]> = { "Mainan & Lainnya": [], "Alat Tulis": [] };
  for (const c of categories) out[groupOfCategory(c.name)].push(c);
  return out;
}

/** Prisma filter for one group — used by the storefront banner links. */
export function groupWhere(group: AdminGroup) {
  const stationery = { category: { name: { contains: "Alat Tulis", mode: "insensitive" as const } } };
  return group === "Alat Tulis" ? stationery : { NOT: stationery };
}

export function isAdminGroup(v: string | undefined): v is AdminGroup {
  return v === "Mainan & Lainnya" || v === "Alat Tulis";
}
