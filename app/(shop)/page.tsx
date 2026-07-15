import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";
import OnboardingTour from "@/components/OnboardingTour";
import CategoryDropdown from "@/components/CategoryDropdown";
import Reveal from "@/components/Reveal";
import Image from "next/image";
import { formatIDR } from "@/lib/format";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const [categories, products, featured] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: category ? { category: { slug: category } } : undefined,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { featured: true },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      take: 4,
    }),
  ]);

  // Sidebar featured elements
  const hotDealProduct = featured[0] || products[0];
  const hotDealDiscount = hotDealProduct?.compareAtPrice
    ? Math.round((1 - hotDealProduct.price / hotDealProduct.compareAtPrice) * 100)
    : 0;

  const specialOffers = featured.slice(1, 4);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-12 gap-6 sm:gap-8">

          {/* LEFT SIDEBAR (col-span-12 on mobile, col-span-3 on desktop) */}
          <aside className="col-span-12 lg:col-span-3 order-2 lg:order-1 flex flex-col gap-6">

            {/* 1. Category Vertical Menu */}
            <div className="border border-slate-200 bg-white rounded-md overflow-hidden shadow-sm">
              <div className="bg-bimbi-mint text-white px-4 py-3.5 flex items-center gap-2 font-display uppercase tracking-wider text-sm font-bold">
                <span>☰</span>
                <span>Kategori Mainan</span>
              </div>
              <nav className="flex flex-col divide-y divide-slate-100">
                <Link
                  href="/"
                  className={`flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 ${!category ? "text-bimbi-sky bg-blue-50/20" : "text-slate-600"
                    }`}
                >
                  <span>Semua Mainan</span>
                  <span className="text-slate-300 text-xs">▶</span>
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/?category=${c.slug}`}
                    className={`flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 ${category === c.slug ? "text-bimbi-sky bg-blue-50/20" : "text-slate-600"
                      }`}
                  >
                    <span>{c.emoji} {c.name}</span>
                    <span className="text-slate-300 text-xs">▶</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* 2. Hot Deals Widget (without countdown) */}
            {hotDealProduct && (
              <Reveal>
              <div className="border border-slate-200 bg-white rounded-md p-4 flex flex-col items-center text-center shadow-sm">
                <div className="border-b border-slate-100 pb-2 w-full text-left font-display text-sm font-bold text-bimbi-pink flex items-center justify-between">
                  <span>🔥 PROMO HITS</span>
                  {hotDealDiscount > 0 && (
                    <span className="text-[10px] bg-bimbi-pink text-white px-1.5 py-0.5 rounded uppercase font-bold">Hemat!</span>
                  )}
                </div>

                <Link href={`/product/${hotDealProduct.slug}`} className="group block w-full mt-3">
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-50 rounded-lg flex items-center justify-center">
                    {hotDealProduct.images[0]?.url ? (
                      <Image
                        src={hotDealProduct.images[0].url}
                        alt={hotDealProduct.name}
                        fill
                        sizes="250px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-5xl text-slate-300">🧸</div>
                    )}
                    {hotDealDiscount > 0 && (
                      <span className="absolute top-2 left-2 rounded bg-bimbi-pink px-2 py-0.5 text-[10px] font-bold text-white shadow-sm z-10">
                        -{hotDealDiscount}%
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 font-display text-sm font-semibold text-slate-800 line-clamp-2 hover:text-bimbi-sky transition-colors min-h-[2.4rem] leading-snug">
                    {hotDealProduct.name}
                  </h4>

                  {/* Rating stars */}
                  <div className="flex items-center justify-center gap-0.5 my-2 text-amber-400 text-xs">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>

                  <div className="flex items-baseline justify-center gap-2 mt-1">
                    <span className="font-display font-bold text-base text-bimbi-sky">
                      {formatIDR(hotDealProduct.price)}
                    </span>
                    {hotDealProduct.compareAtPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatIDR(hotDealProduct.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </Link>

                <Link
                  href={`/product/${hotDealProduct.slug}`}
                  className="mt-4 w-full bg-bimbi-sky hover:bg-blue-800 text-white py-2 text-xs font-bold rounded-md transition-colors block text-center uppercase tracking-wider cursor-pointer"
                >
                  Detail Mainan
                </Link>
              </div>
              </Reveal>
            )}

            {/* 3. Special Offers Recommendations */}
            {specialOffers.length > 0 && (
              <Reveal delay={100}>
              <div className="border border-slate-200 bg-white rounded-md p-4 shadow-sm">
                <h4 className="border-b border-slate-100 pb-2 font-display text-sm font-bold text-bimbi-grape uppercase tracking-wider">
                  Rekomendasi
                </h4>
                <div className="space-y-4 mt-3">
                  {specialOffers.map((p) => {
                    const discount = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
                    return (
                      <Link key={p.id} href={`/product/${p.slug}`} className="flex gap-3 items-center group">
                        <div className="relative h-14 w-14 rounded bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                          {p.images[0]?.url ? (
                            <Image
                              src={p.images[0].url}
                              alt={p.name}
                              fill
                              sizes="60px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xl bg-slate-100">🧸</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-display text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-bimbi-sky leading-tight">
                            {p.name}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-bimbi-sky">
                              {formatIDR(p.price)}
                            </span>
                            {discount > 0 && (
                              <span className="text-[9px] text-bimbi-pink font-bold">
                                -{discount}%
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              </Reveal>
            )}
          </aside>

          {/* MAIN CONTENT AREA (col-span-12 on mobile, col-span-9 on desktop) */}
          <main className="col-span-12 lg:col-span-9 order-1 lg:order-2 flex flex-col gap-6">

            {/* 1. Hero Banner */}
            <div className="relative overflow-hidden rounded-md bg-white border border-slate-100 shadow-sm min-h-[300px] flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 md:p-10 gap-6">
              {/* Floating toys — decorative, kept behind and to the right of the text */}
              <span aria-hidden className="animate-float pointer-events-none select-none absolute right-6 top-8 text-6xl opacity-20">🧸</span>
              <span aria-hidden className="animate-float-slow pointer-events-none select-none absolute right-28 bottom-8 text-5xl opacity-15">🚂</span>
              <span aria-hidden className="animate-float pointer-events-none select-none absolute right-44 top-16 text-4xl opacity-10" style={{ animationDelay: "2.5s" }}>🎈</span>
              <div className="flex-1 space-y-4 max-w-md text-left z-10">
                <span className="text-xs font-bold uppercase tracking-widest text-bimbi-pink bg-red-50 px-2.5 py-1 rounded-full">
                  Tentang Bimbi Toys
                </span>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-slate-800 leading-tight font-extrabold uppercase">
                  Teman Bermain &amp; Belajar Anak
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Ribuan mainan asli berkualitas, aman, dan edukatif untuk buah hati Anda. Dapatkan penawaran harga terbaik dan gratis ongkir se-Indonesia!
                </p>
                <div className="pt-2">
                  <Link
                    href="#katalog"
                    className="inline-block rounded-md bg-bimbi-sky hover:bg-blue-800 px-6 py-3 font-bold text-white text-sm shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Mulai Belanja
                  </Link>
                </div>
              </div>
            </div>

            {/* 3. Catalog Section with Tab Bar */}
            <Reveal>
            <section id="katalog" className="scroll-mt-6 border border-slate-200 bg-white rounded-md p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 mb-6 gap-4">
                <h3 className="font-display text-lg font-bold text-slate-800 uppercase tracking-wider">
                  {category
                    ? categories.find((c) => c.slug === category)?.name
                    : "Semua Koleksi Mainan"}
                </h3>

                {/* Category filter dropdown — stays tidy however many categories exist */}
                <CategoryDropdown
                  categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji }))}
                  current={category}
                />
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl">🧸</span>
                  <p className="text-slate-500 mt-3 text-sm font-semibold">
                    Belum ada mainan di kategori ini. Coba lihat kategori lain, yuk!
                  </p>
                </div>
              ) : (
                <div data-tour="products" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 animate-pop-in">
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

          </main>

        </div>
      </div >

      <OnboardingTour />
    </div >
  );
}
