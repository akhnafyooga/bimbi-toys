import PendingLink from "@/components/PendingLink";
import { prisma } from "@/lib/prisma";
import { isPriceBucketKey, priceBucket, priceInRange, shelfPriceRange } from "@/lib/shelf";
import ShelfToolbar from "@/components/shelf/ShelfToolbar";
import ShelfGroup from "@/components/shelf/ShelfGroup";
import ShelfSearchResults, { type ShelfSearchHit } from "@/components/shelf/ShelfSearchResults";
import type { ShelfCardData } from "@/components/shelf/ShelfCard";

// "Lihat Ada Apa di Toko" — a digital store-shelf catalog, not the product
// catalog. Customer journey: choose store → browse shelf categories → open a
// shelf → open a product.
export default async function ShelfBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ toko?: string; harga?: string; q?: string }>;
}) {
  const { toko, harga, q } = await searchParams;
  const priceKey = isPriceBucketKey(harga) ? harga : undefined;
  const query = q?.trim() ?? "";

  const stores = await prisma.storeLocation.findMany({ orderBy: { name: "asc" } });

  // No stores at all yet — nothing to browse.
  if (stores.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-bimbi-ink">Lihat Ada Apa di Toko</h1>
        <p className="mt-3 text-sm text-slate-500">
          Belum ada toko terdaftar. Rak toko akan segera bisa dijelajahi — nantikan ya!
        </p>
      </div>
    );
  }

  const selected = stores.find((s) => s.id === toko) ?? stores[0];

  // Shelves with their products' prices — enough to compute each shelf's
  // count and min–max range, and to test the price filter against actual
  // products (a shelf stays visible if ANY of its prices fits the bucket).
  const shelves = await prisma.shelf.findMany({
    where: { storeId: selected.id, active: true },
    include: {
      category: true,
      products: { select: { product: { select: { price: true } } }, orderBy: { position: "asc" } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  const visibleShelves = priceKey
    ? shelves.filter((s) => s.products.some((ps) => priceInRange(ps.product.price, priceKey)))
    : shelves;

  const asCard = (shelf: (typeof shelves)[number]): ShelfCardData => {
    const prices = shelf.products.map((ps) => ps.product.price);
    const range = shelfPriceRange(prices);
    return {
      id: shelf.id,
      name: shelf.name,
      code: shelf.code,
      image: shelf.image,
      productCount: shelf.products.length,
      minPrice: range?.min ?? null,
      maxPrice: range?.max ?? null,
    };
  };

  // Group by shelf category, keeping the admin's ordering.
  const groups = new Map<string, { position: number; cards: ShelfCardData[] }>();
  for (const shelf of visibleShelves) {
    const entry = groups.get(shelf.category.name) ?? { position: shelf.category.position, cards: [] };
    entry.cards.push(asCard(shelf));
    groups.set(shelf.category.name, entry);
  }
  const grouped = [...groups.entries()].sort(
    (a, b) => a[1].position - b[1].position || a[0].localeCompare(b[0])
  );

  // Store-wide product search across this store's shelves (architecture is
  // structured so this stays one query on the join model).
  let searchHits: ShelfSearchHit[] = [];
  if (query.length >= 2) {
    const bucket = priceKey ? priceBucket(priceKey) : null;
    const rows = await prisma.productShelf.findMany({
      where: {
        shelf: { storeId: selected.id, active: true },
        product: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
          ...(bucket ? { price: { gte: bucket.min, lte: bucket.max } } : {}),
        },
      },
      include: {
        product: { select: { id: true, name: true, displayName: true, slug: true, price: true } },
        shelf: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ shelf: { position: "asc" } }, { position: "asc" }],
      take: 40,
    });
    searchHits = rows.map((row) => ({
      productId: row.product.id,
      slug: row.product.slug,
      name: row.product.displayName ?? row.product.name,
      price: row.product.price,
      shelfId: row.shelf.id,
      shelfName: row.shelf.name,
      shelfCode: row.shelf.code,
    }));
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14 space-y-8">
        {/* Masthead */}
        <header className="max-w-2xl">
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-bimbi-ink leading-tight">
            Lihat Ada Apa di Toko
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Lihat koleksi mainan yang tersedia di rak toko kami.
          </p>
        </header>

        <ShelfToolbar
          stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          selectedStoreId={selected.id}
          activePrice={priceKey}
          query={query}
        />

        {/* Search results replace the shelf groups while searching */}
        {query.length >= 2 ? (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-bimbi-ink">
                Hasil pencarian &quot;{query}&quot;
              </h2>
              <PendingLink
                href={`/store?toko=${selected.id}`}
                label="Batal pencarian"
                overlayLabel={null}
                className="relative text-xs font-bold text-bimbi-pink-dark hover:underline"
              >
                Batal pencarian ×
              </PendingLink>
            </div>
            <ShelfSearchResults query={query} hits={searchHits} />
          </section>
        ) : shelves.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-card px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-slate-800">Rak toko ini sedang disiapkan.</p>
            <p className="mt-1 text-sm text-slate-500">
              Kunjungan berikutnya, rak {selected.name} bisa kamu jelajahi dari rumah.
            </p>
          </div>
        ) : visibleShelves.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-card px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-slate-800">Tidak ada rak dengan harga di rentang itu.</p>
            <PendingLink
              href={`/store?toko=${selected.id}`}
              label="Lihat semua harga"
              overlayLabel={null}
              className="relative mt-3 inline-block text-sm font-bold text-bimbi-pink-dark hover:underline"
            >
              Lihat semua harga
            </PendingLink>
          </div>
        ) : (
          <div className="space-y-10 md:space-y-12">
            {grouped.map(([categoryName, { cards }]) => (
              <ShelfGroup key={categoryName} categoryName={categoryName} shelves={cards} />
            ))}
          </div>
        )}

        <footer className="border-t border-slate-200 pt-6 pb-4 text-xs text-slate-400">
          Harga dan ketersediaan rak dapat berubah — pesanan akhir dikonfirmasi lewat WhatsApp toko.
        </footer>
      </div>
    </div>
  );
}
