import { PrismaClient } from "@prisma/client";

// One-off: seeds shelf categories and a first set of shelves per store so the
// "Lihat Ada Apa di Toko" feature can be tried immediately. Idempotent —
// re-running never duplicates shelves or reassigns products.
//   npx tsx prisma/seed-shelves.ts
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Mainan Bayi", slug: "mainan-bayi" },
  { name: "Edukasi", slug: "edukasi" },
  { name: "Kendaraan", slug: "kendaraan" },
  { name: "Boneka", slug: "boneka" },
  { name: "Kreativitas", slug: "kreativitas" },
  { name: "Outdoor", slug: "outdoor" },
  { name: "Koleksi Lainnya", slug: "koleksi-lainnya" },
];

// Heuristics mapping PRODUCT categories (by name) onto shelf categories.
const MATCHERS: { slug: string; keywords: string[]; code: string; name: string }[] = [
  { slug: "mainan-bayi", keywords: ["bayi", "baby", "toddler"], code: "BAY-01", name: "Mainan Bayi & Toddler" },
  { slug: "edukasi", keywords: ["edu", "puzzle", "balok", "stem", "belajar"], code: "EDU-01", name: "Mainan Edukasi" },
  { slug: "kendaraan", keywords: ["mobil", "kendaraan", "diecast", "rc", "kereta"], code: "KND-01", name: "Kendaraan & RC" },
  { slug: "boneka", keywords: ["boneka", "doll", "boneka"], code: "BNK-01", name: "Boneka & Sahabat Peluk" },
  { slug: "kreativitas", keywords: ["kreativ", "gambar", "mewarnai", "craft", "seni"], code: "KRT-01", name: "Kreativitas & Seni" },
  { slug: "outdoor", keywords: ["outdoor", "sport", "olahraga", "sepeda"], code: "OUT-01", name: "Outdoor & Sport" },
];

const FALLBACK = { slug: "koleksi-lainnya", code: "LIN-01", name: "Koleksi Lainnya" };

async function main() {
  console.log("🏷️  Seeding shelf categories & sample shelves...");

  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    await prisma.shelfCategory.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, position: i } });
  }
  const categories = await prisma.shelfCategory.findMany();
  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  const [stores, products] = await Promise.all([
    prisma.storeLocation.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      select: { id: true, name: true, price: true, categoryId: true, category: { select: { name: true } } },
      orderBy: { price: "asc" },
    }),
  ]);

  if (stores.length === 0) {
    console.log("No stores found — nothing to do.");
    return;
  }
  if (products.length === 0) {
    console.log("No products found — shelves will be created empty.");
  }

  // Assign products to shelf categories once, then reuse per store so every
  // store shows the same assortment. Rotating offsets would be nicer, but
  // identical lists keep the demo predictable.
  const buckets = new Map<string, { id: string; price: number }[]>();
  for (const m of [...MATCHERS, FALLBACK]) buckets.set(m.slug, []);

  for (const p of products) {
    const catName = p.category.name.toLowerCase();
    const target =
      MATCHERS.find((m) => m.keywords.some((k) => catName.includes(k)))?.slug ?? FALLBACK.slug;
    buckets.get(target)!.push({ id: p.id, price: p.price });
  }

  // If a category ended up empty, sprinkle a few products in so no shelf is
  // blank in the demo (cap each shelf at 12 products, cheapest first).
  const overflow = buckets.get(FALLBACK.slug)!;
  for (const m of MATCHERS) {
    const list = buckets.get(m.slug)!;
    if (list.length === 0 && overflow.length > MATCHERS.length) {
      const moved = overflow.splice(0, 5);
      list.push(...moved);
    }
  }

  for (const store of stores) {
    const existing = await prisma.shelf.count({ where: { storeId: store.id } });
    if (existing > 0) {
      console.log(`↷ ${store.name}: already has ${existing} shelves, skipping.`);
      continue;
    }

    for (const m of [...MATCHERS, FALLBACK]) {
      const list = buckets.get(m.slug)!.slice(0, 12);
      const shelf = await prisma.shelf.create({
        data: {
          storeId: store.id,
          categoryId: catId(m.slug),
          name: m.name,
          code: m.code,
          description: `Pilihan ${m.name.toLowerCase()} yang sedang dipajang di ${store.name}.`,
          position: MATCHERS.findIndex((x) => x.slug === m.slug) >= 0
            ? MATCHERS.findIndex((x) => x.slug === m.slug)
            : MATCHERS.length,
          active: true,
        },
      });
      if (list.length > 0) {
        await prisma.productShelf.createMany({
          data: list.map((p, i) => ({ productId: p.id, shelfId: shelf.id, position: i })),
          skipDuplicates: true,
        });
      }
      console.log(`  + ${store.name}: rak ${shelf.code} (${m.name}) — ${list.length} produk`);
    }
  }

  console.log("✅ Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
