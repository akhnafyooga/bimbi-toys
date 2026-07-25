import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import OnboardingTour from "@/components/OnboardingTour";
import CategoryDropdown from "@/components/CategoryDropdown";
import Reveal from "@/components/Reveal";
import { pickDailyBalanced } from "@/lib/dailyPicks";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [categories, products, allForPicks] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: category ? { category: { slug: category } } : undefined,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    // Pool for the daily "Penawaran Hits" pick — every product, one image each.
    prisma.product.findMany({
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
  ]);

  // 10 products, spread evenly across categories, reshuffled on EVERY request
  // (random seed) so "Penawaran Hits" changes on each refresh / new visit.
  const hitPicks = pickDailyBalanced(allForPicks, 10, crypto.randomUUID());

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10 pb-6 flex flex-col gap-8">

        {/* 1. Hero Banner — background image slot: public/brand/hero.jpg
            (light-blue fallback shows until the file exists) */}
        <div
          className="relative overflow-hidden rounded-lg bg-bimbi-sun min-h-[240px] md:min-h-[300px] flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 md:p-10 gap-6 bg-cover bg-center"
          style={{ backgroundImage: "url(/brand/hero.jpg)" }}
        >
          {/* readability wash so the headline stays legible over any photo */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
          <div className="flex-1 space-y-3 max-w-lg text-left z-10">
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

        {/* 2. Deals strip — 10 daily picks, balanced across categories */}
        {hitPicks.length > 0 && (
          <Reveal>
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-xl font-extrabold text-bimbi-ink">Penawaran Hits</h2>
                <Link href="/#katalog" className="text-sm font-bold text-bimbi-pink hover:underline">
                  Lihat semua
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
                {hitPicks.map((p) => (
                  <div key={p.id} className="w-44 sm:w-52 shrink-0">
                    <ProductCard
                      slug={p.slug}
                      name={p.name}
                      price={p.price}
                      compareAtPrice={p.compareAtPrice}
                      imageUrl={p.images[0]?.url ?? ""}
                    />
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* 3. Catalog — full-width Walmart grid */}
        <Reveal>
          <section id="katalog" className="scroll-mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-5 gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-bimbi-ink">
                  {category
                    ? categories.find((c) => c.slug === category)?.name
                    : "Semua Koleksi"}{" "}
                  <span className="text-slate-400 font-semibold text-base">({products.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Harga saat dibeli online.</p>
              </div>

              <CategoryDropdown
                categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji }))}
                current={category}
              />
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mt-3 text-sm font-semibold">
                  Belum ada barang di kategori ini. Coba lihat kategori lain, yuk!
                </p>
              </div>
            ) : (
              <div data-tour="products" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 animate-pop-in">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    name={p.name}
                    price={p.price}
                    compareAtPrice={p.compareAtPrice}
                    imageUrl={p.images[0]?.url ?? ""}
                  />
                ))}
              </div>
            )}
          </section>
        </Reveal>

      </div>

      <OnboardingTour />
    </div>
  );
}
