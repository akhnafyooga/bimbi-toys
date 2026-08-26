import PendingLink from "@/components/PendingLink";
import { prisma } from "@/lib/prisma";
import { isPriceBucketKey, shelfRangeInBucket } from "@/lib/shelf";
import ShelfToolbar from "@/components/shelf/ShelfToolbar";
import ShelfGroup from "@/components/shelf/ShelfGroup";
import type { ShelfCardData } from "@/components/shelf/ShelfCard";

// "Lihat Ada Apa di Toko" — a digital store-shelf catalog, not the product
// catalog. Customer journey: choose store → browse shelf categories → open a
// shelf → ask about a product via WhatsApp. Shelves show a photo, a
// description, and one manually curated price range — never a product list.
export default async function ShelfBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ toko?: string; harga?: string }>;
}) {
  const { toko, harga } = await searchParams;
  const priceKey = isPriceBucketKey(harga) ? harga : undefined;

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

  // Shelves with their manually curated price range. The ?harga= filter
  // matches a shelf when its range overlaps the bucket; shelves without a
  // range stay visible while unfiltered.
  const shelves = await prisma.shelf.findMany({
    where: { storeId: selected.id, active: true },
    include: { category: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  const hasRange = (s: (typeof shelves)[number]) => s.priceMin !== null && s.priceMax !== null;
  const visibleShelves = priceKey
    ? shelves.filter((s) => hasRange(s) && shelfRangeInBucket(s.priceMin!, s.priceMax!, priceKey))
    : shelves;

  const asCard = (shelf: (typeof shelves)[number]): ShelfCardData => ({
    id: shelf.id,
    name: shelf.name,
    code: shelf.code,
    image: shelf.image,
    priceMin: shelf.priceMin,
    priceMax: shelf.priceMax,
  });

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

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14 space-y-8">
        {/* Masthead */}
        <header className="max-w-2xl">
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-bimbi-ink leading-tight">
            Lihat Ada Apa di Toko
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Intip koleksi mainan di rak toko kami — mau tahu lebih detail? Tanya lewat WhatsApp.
          </p>
        </header>

        <ShelfToolbar
          stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          selectedStoreId={selected.id}
          activePrice={priceKey}
        />

        {shelves.length === 0 ? (
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
