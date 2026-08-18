import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUserDiscount } from "@/lib/discount";
import ProductCard from "@/components/ProductCard";
import OnboardingTour from "@/components/OnboardingTour";
import CategoryDropdown from "@/components/CategoryDropdown";
import Reveal from "@/components/Reveal";
import CatalogControls from "@/components/CatalogControls";
import { pickDailyBalanced } from "@/lib/dailyPicks";
import QuickTiles from "@/components/QuickTiles";
import ShopByGroup from "@/components/ShopByGroup";
import Rail from "@/components/Rail";
import SegmentRail from "@/components/SegmentRail";
import ToyFinder from "@/components/ToyFinder";
import ShelfTeaser from "@/components/shelf/ShelfTeaser";
import { SEGMENTS, segmentWhere, isSegmentKey } from "@/lib/homeSegments";
import { groupWhere } from "@/lib/adminGroups";
import type { Prisma } from "@prisma/client";

const PAGE = 10; // 2 rows at the desktop 5-column grid, then "Muat lebih banyak"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    min?: string;
    max?: string;
    show?: string;
    segment?: string;
    group?: string;
  }>;
}) {
  const { category, sort, min, max, show, segment, group } = await searchParams;
  const seg = isSegmentKey(segment) ? segment : undefined;
  // "Mau cari apa?" doorways. Reuses the admin classifier so the storefront and
  // the admin panel always mean the same thing by these two groups.
  const grp = group === "alat-tulis" ? "Alat Tulis" : group === "mainan" ? "Mainan & Lainnya" : undefined;
  const showN = Math.min(Math.max(PAGE, Number(show) || PAGE), 2000);

  // Price filter (harga) + sort, both driven by the URL via CatalogControls.
  const priceFilter: Prisma.ProductWhereInput =
    min || max
      ? { price: { ...(min ? { gte: Number(min) } : {}), ...(max ? { lte: Number(max) } : {}) } }
      : {};
  // `segment` is additive: it ANDs with whatever category/price filters are
  // already in the URL, so CatalogControls and the category dropdown keep
  // working exactly as before.
  const where: Prisma.ProductWhereInput = {
    AND: [
      category ? { category: { slug: category } } : {},
      priceFilter,
      seg ? segmentWhere(seg) : {},
      grp ? groupWhere(grp) : {},
    ],
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "termurah"
      ? { price: "asc" }
      : sort === "termahal"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [categories, total, products, allForPicks, discountPercent] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      take: showN,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    // Pool for the "Penawaran Hits" pick — every product, one image each.
    prisma.product.findMany({
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    // "Harga spesial kenalan" — 0 for guests and normal customers.
    getUserDiscount(),
  ]);

  // One query per merchandising rail. Each is capped at 12 and only needs a
  // single image, so this stays cheap next to the catalog query above.
  const railItems = await Promise.all(
    SEGMENTS.map((sgm) =>
      prisma.product.findMany({
        where: { AND: [segmentWhere(sgm.key), { images: { some: {} } }] },
        take: 12,
        orderBy: { createdAt: "desc" },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      })
    )
  );

  // 10 products, spread evenly across categories, reshuffled on EVERY request
  // (random seed) so "Penawaran Hits" changes on each refresh / new visit.
  const hitPicks = pickDailyBalanced(allForPicks, 10, crypto.randomUUID());

  // "Muat lebih banyak" grows `show` while preserving category/sort/price.
  const moreQuery = new URLSearchParams();
  if (category) moreQuery.set("category", category);
  if (sort) moreQuery.set("sort", sort);
  if (min) moreQuery.set("min", String(min));
  if (max) moreQuery.set("max", String(max));
  if (seg) moreQuery.set("segment", seg);
  if (group) moreQuery.set("group", group);
  moreQuery.set("show", String(showN + PAGE));
  const moreHref = `/?${moreQuery.toString()}`;

  return (
    <div className="bg-white min-h-screen">

      {/* 1. Hero Banner — FULL WIDTH (edge to edge). bg image: public/brand/hero.jpg */}
      <div
        className="relative overflow-hidden bg-bimbi-sun min-h-[240px] md:min-h-[320px] bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/hero.jpg)" }}
      >
        {/* readability wash so the headline stays legible over any photo */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 py-10 md:py-16">
          <div className="space-y-3 max-w-lg text-left ml-2 sm:ml-6 md:ml-8 lg:ml-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-bimbi-pink">
              Tentang Bimbi Toys
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-bimbi-ink leading-tight font-extrabold">
              Teman Bermain &amp; Belajar Anak
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ribuan mainan asli berkualitas, aman, dan edukatif untuk buah hati Anda.
              Dapatkan penawaran harga terbaik!
            </p>
            <div className="pt-2">
              <Link
                href="#katalog"
                className="inline-block rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-7 py-3 font-extrabold text-white text-sm transition-colors chip-spring"
              >
                Mulai Belanja
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 md:pt-10 pb-6 flex flex-col gap-10 md:gap-14">

        {/* 2. Mau cari apa? — the two top-level doorways */}
        <Reveal>
          <ShopByGroup />
        </Reveal>

        {/* 3. Yang Kamu Cari — category shortcuts */}
        <Reveal>
          <QuickTiles />
        </Reveal>

        {/* 3. Shelf teaser — "Lihat Ada Apa di Toko" */}
        <Reveal>
          <ShelfTeaser />
        </Reveal>

        {/* 3.5 Deals strip — 10 daily picks, balanced across categories */}
        {hitPicks.length > 0 && (
          <Reveal>
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink">Penawaran Hits</h2>
                <Link href="/#katalog" className="text-sm font-bold text-bimbi-pink-dark hover:underline">
                  Lihat semua
                </Link>
              </div>
              <Rail showDots maxTrack="lg:max-w-[1040px]">
                {hitPicks.map((p) => (
                  <div key={p.id} className="w-32 sm:w-36 lg:w-40 shrink-0">
                    <ProductCard
                      productId={p.id}
              slug={p.slug}
                      name={p.displayName ?? p.name}
                      price={p.price}
                      compareAtPrice={p.compareAtPrice}
                      imageUrl={p.images[0]?.url ?? ""}
                      discountPercent={discountPercent}
                    />
                  </div>
                ))}
              </Rail>
            </section>
          </Reveal>
        )}

        {/* 4. Merchandising rails — who the toy is for */}
        {/* One stack, no gap: the bands must be adjacent siblings for the
            overlap that joins their colours. A <Reveal> wrapper around each
            would break that adjacency. */}
        <div className="segment-stack">
          {SEGMENTS.map((sgm, i) => (
            <SegmentRail
              key={sgm.key}
              title={sgm.title}
              blurb={sgm.blurb}
              href={`/?segment=${sgm.key}#katalog`}
              items={railItems[i]}
              discountPercent={discountPercent}
              band={sgm.band}
              headingClass={sgm.headingClass}
            />
          ))}
        </div>

        {/* 5. Guided finder — gender + budget, lands on the catalog below */}
        <Reveal>
          <ToyFinder
            initialSegment={seg}
            initialMax={max ? Number(max) : undefined}
          />
        </Reveal>

        {/* 6. Catalog — full-width Walmart grid */}
        <Reveal>
          <section
            id="katalog"
            className="scroll-mt-6 rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-300 pb-4 mb-5 gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink">
                  {grp
                    ? grp
                    : seg
                    ? SEGMENTS.find((x) => x.key === seg)?.title
                    : category
                      ? categories.find((c) => c.slug === category)?.name
                      : "Semua Koleksi"}{" "}
                  <span className="text-slate-500 font-semibold text-base">({total})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Harga saat dibeli online.</p>
              </div>

              <CategoryDropdown
                categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji }))}
                current={category}
              />
            </div>

            {/* Sort + price filter */}
            <div className="mb-5">
              <CatalogControls category={category} sort={sort} min={min} max={max} />
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mt-3 text-sm font-semibold">
                  Belum ada barang di kategori ini. Coba lihat kategori lain, yuk!
                </p>
              </div>
            ) : (
              <>
                <div data-tour="products" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 animate-pop-in">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      productId={p.id}
              slug={p.slug}
                      name={p.displayName ?? p.name}
                      price={p.price}
                      compareAtPrice={p.compareAtPrice}
                      imageUrl={p.images[0]?.url ?? ""}
                      discountPercent={discountPercent}
                    />
                  ))}
                </div>

                {showN < total && (
                  <div className="flex justify-center mt-8">
                    <Link
                      href={moreHref}
                      scroll={false}
                      className="font-bold text-bimbi-pink-dark hover:underline chip-spring"
                    >
                      Muat lebih banyak ↓
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>
        </Reveal>

      </div>

      <OnboardingTour />
    </div>
  );
}
