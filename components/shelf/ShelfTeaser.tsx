import { existsSync } from "fs";
import path from "path";
import Image from "next/image";
import PendingLink from "@/components/PendingLink";
import { prisma } from "@/lib/prisma";
import StoreSlider from "@/components/shelf/StoreSlider";

// Homepage teaser for "Lihat Ada Apa di Toko", reframed around the customer
// hook: no time to visit the store? Browse each store's racks from home.
// One wide slide per store — EVERY store in the DB gets one. Collage photos
// are optional garnish: a store whose name contains a fragment below (and
// has the matching file in public/brand/) shows that photo, any other store
// gets the text-placeholder slide. Renaming/adding stores never removes
// them from here.

const COLLAGES = [
  { nameIncludes: "Jatisari", image: "/brand/shelf-college-jatisari.jpeg" },
  { nameIncludes: "Ngaliyan", image: "/brand/shelf-college-ngaliyan.jpeg" },
  { nameIncludes: "Pamularsih", image: "/brand/shelf-collegeg-pamularsih.jpeg" },
];

export default async function ShelfTeaser() {
  const stores = await prisma.storeLocation.findMany({ orderBy: { name: "asc" } });
  if (stores.length === 0) return null;

  const slides = stores.map((store) => {
    const cfg = COLLAGES.find((c) => store.name.toLowerCase().includes(c.nameIncludes.toLowerCase()));
    const image = cfg && existsSync(path.join(process.cwd(), "public", cfg.image)) ? cfg.image : null;
    return { store, image };
  });

  return (
    <section aria-labelledby="buat-kamu-yang-gasempet">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="buat-kamu-yang-gasempet" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink">
          Buat kamu yang gak sempet ke toko
        </h2>
        <PendingLink
          href="/store"
          label="Lihat semua rak toko"
          overlayLabel={null}
          className="relative shrink-0 text-sm font-bold text-bimbi-pink-dark hover:underline"
        >
          Lihat semua
        </PendingLink>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-4 sm:mb-5">
        Intip rak tiap toko langsung dari sini — pilih tokonya, lihat raknya, tandai mainan yang kamu penasaran.
      </p>

      <StoreSlider count={slides.length}>
        {slides.map(({ store, image }, i) => (
          <PendingLink
            key={store.id}
            href={`/store?toko=${store.id}`}
            label={`Lihat rak ${store.name}`}
            className="group relative block w-full shrink-0 snap-start aspect-[4/3] md:aspect-[21/9] overflow-hidden bg-slate-100"
          >
            {image ? (
              <Image
                src={image}
                alt={`Koleksi rak ${store.name}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1280px) 1216px, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-bimbi-sun via-white to-slate-100 px-6 text-center">
                <span className="text-lg sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink">{store.name}</span>
                <span className="text-xs sm:text-sm text-slate-500">Collage foto toko &amp; rak segera hadir</span>
              </div>
            )}

            {/* readability wash — deep at the bottom, fading through a mid
                stop so the store name/city stay legible over bright collages */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-6 sm:flex-row sm:items-end sm:justify-between">
              {image && (
                <div>
                  <p className="text-base sm:text-xl font-extrabold text-white drop-shadow-md">{store.name}</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/90">{store.city}</p>
                </div>
              )}
              <span className="self-start rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-extrabold text-bimbi-ink shadow chip-spring transition-colors group-hover:bg-bimbi-sun sm:self-auto">
                Lihat Ada Apa di Toko →
              </span>
            </div>
          </PendingLink>
        ))}
      </StoreSlider>
    </section>
  );
}
