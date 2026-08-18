import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shelfPriceRange } from "@/lib/shelf";
import { formatIDR } from "@/lib/format";

// Small homepage teaser for "Lihat Ada Apa di Toko" — three representative
// shelves and a link into the dedicated shelf experience. Renders nothing
// when the store has no shelves yet, so the homepage is unchanged at launch.
export default async function ShelfTeaser() {
  // Ordered by display order; the busiest shelves make the best preview.
  const shelves = await prisma.shelf.findMany({
    where: { active: true },
    include: {
      store: { select: { name: true } },
      products: { select: { product: { select: { price: true } } } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: 12,
  });

  if (shelves.length === 0) return null;

  const cards = shelves
    .map((shelf) => {
      const prices = shelf.products.map((ps) => ps.product.price);
      const range = shelfPriceRange(prices);
      return {
        id: shelf.id,
        name: shelf.name,
        code: shelf.code,
        image: shelf.image,
        productCount: prices.length,
        minPrice: range?.min ?? null,
        maxPrice: range?.max ?? null,
      };
    })
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 3);

  return (
    <section aria-labelledby="lihat-ada-apa">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="lihat-ada-apa" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink">
          Lihat Ada Apa di Toko
        </h2>
        <Link href="/store" className="shrink-0 text-sm font-bold text-bimbi-pink-dark hover:underline">
          Lihat semua
        </Link>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-4 sm:mb-5">
        Intip koleksi mainan yang ada langsung di rak toko kami.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((shelf) => (
          <Link
            key={shelf.id}
            href={`/store/${shelf.id}`}
            className="group block overflow-hidden border border-slate-200 bg-white shadow-card card-lively"
            aria-label={`Lihat rak ${shelf.name} (${shelf.code})`}
          >
            <div className="relative aspect-[4/3] bg-slate-100">
              {shelf.image ? (
                <Image
                  src={shelf.image}
                  alt={`Foto rak ${shelf.code}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <span className="text-lg font-extrabold uppercase tracking-widest text-slate-300">
                    {shelf.code}
                  </span>
                  <span className="text-[11px] text-slate-400">foto rak segera hadir</span>
                </div>
              )}
              <span className="absolute top-2 right-2 bg-bimbi-sky px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {shelf.productCount} item
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-bold leading-snug text-bimbi-grape group-hover:underline">
                {shelf.name}
              </h3>

              {shelf.minPrice !== null && shelf.maxPrice !== null ? (
                <p className="mt-1 text-sm font-extrabold tracking-tight text-bimbi-ink">
                  {shelf.minPrice === shelf.maxPrice
                    ? formatIDR(shelf.minPrice)
                    : `${formatIDR(shelf.minPrice)} – ${formatIDR(shelf.maxPrice)}`}
                </p>
              ) : (
                <p className="mt-1 text-sm italic text-slate-400">Belum ada produk di rak ini</p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Rak {shelf.code}
                </span>
                <span className="text-sm font-bold text-bimbi-pink-dark">Lihat Rak →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
