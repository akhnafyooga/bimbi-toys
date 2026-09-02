import PendingLink from "@/components/PendingLink";
import { prisma } from "@/lib/prisma";
import { isPriceBucketKey, shelfRangeInBucket } from "@/lib/shelf";
import { layoutShelfBoard } from "@/lib/shelfScatter";
import ShelfToolbar from "@/components/shelf/ShelfToolbar";
import ShelfCanvas from "@/components/shelf/ShelfCanvas";
import IntroOverlay from "@/components/IntroOverlay";
import ShelfCard, { type ShelfCardData } from "@/components/shelf/ShelfCard";

// "Lihat Ada Apa di Toko" — a digital store-shelf catalog, not the product
// catalog. Customer journey: choose store → roam the shelf board → open a
// shelf → ask about a product via WhatsApp. Shelves show a photo, a
// description, and one manually curated price range — never a product list.
//
// The shelves live on a FREE-ROAM board (ShelfCanvas): category
// neighbourhoods scattered by a deterministic seed (lib/shelfScatter.ts), so
// the segmentation is a badge inside each card — not section headers.
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
    category: shelf.category.name,
  });

  // Cluster by shelf category, keeping the admin's ordering — each cluster
  // becomes one loose neighbourhood on the board.
  const groups = new Map<string, { position: number; cards: ShelfCardData[] }>();
  for (const shelf of visibleShelves) {
    const entry = groups.get(shelf.category.name) ?? { position: shelf.category.position, cards: [] };
    entry.cards.push(asCard(shelf));
    groups.set(shelf.category.name, entry);
  }
  const grouped = [...groups.entries()].sort(
    (a, b) => a[1].position - b[1].position || a[0].localeCompare(b[0])
  );

  const board = layoutShelfBoard(
    grouped.map(([name, { cards }]) => ({ key: name, items: cards.map((c) => ({ id: c.id })) }))
  );

  return (
    <div className="min-h-screen">
      {/* Masthead — compact, so the board gets the viewport */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-4">
        <header className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-bimbi-ink leading-tight">
            Lihat Ada Apa di Toko
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Intip koleksi mainan di rak toko kami — mau tahu lebih detail? Tanya lewat WhatsApp.
          </p>
        </header>
      </div>

      {shelves.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="glass rounded-xl px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-slate-800">Rak toko ini sedang disiapkan.</p>
            <p className="mt-1 text-sm text-slate-500">
              Kunjungan berikutnya, rak {selected.name} bisa kamu jelajahi dari rumah.
            </p>
          </div>
        </div>
      ) : visibleShelves.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="glass rounded-xl px-6 py-14 text-center">
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
        </div>
      ) : (
        <div className="relative h-[clamp(480px,calc(100dvh-15rem),880px)] w-full">
          {/* Onboarding veil (once per session) — teaches the pan gesture,
              then dissolves on the first touch/wheel input. Inside the canvas
              branch so empty states neither show it nor burn the session flag. */}
          <IntroOverlay />

          {/* Floating glass toolbar over the board (store + price filter) */}
          <ShelfToolbar
            stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
            selectedStoreId={selected.id}
            activePrice={priceKey}
          />

          <ShelfCanvas board={{ width: board.width, height: board.height }}>
            {grouped.flatMap(([, { cards }]) =>
              cards.map((shelf) => {
                const s = board.cards[shelf.id]!;
                return (
                  <div
                    key={shelf.id}
                    className="shelf-enter absolute"
                    style={{
                      left: s.x,
                      top: s.y,
                      width: s.width,
                      zIndex: s.zIndex,
                      animationDelay: `${s.enterDelay}ms`,
                    }}
                  >
                    <div
                      className="shelf-pose"
                        style={{ transform: `scale(${s.scale})` }}
                    >
                      <div
                        className="shelf-float"
                        style={
                          {
                            "--bob-tilt": `${s.bobTilt}deg`,
                            "--bob-duration": `${s.bobDuration}s`,
                            "--bob-delay": `${s.bobDelay}s`,
                          } as React.CSSProperties
                        }
                      >
                        <ShelfCard shelf={shelf} priority={s.zIndex < 2} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </ShelfCanvas>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-xs text-slate-400">
        Harga dan ketersediaan rak dapat berubah — pesanan akhir dikonfirmasi lewat WhatsApp toko.
      </div>
    </div>
  );
}
