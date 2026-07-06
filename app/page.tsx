import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";
import Image from "next/image";

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

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-bimbi-sky/30 to-bimbi-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20 text-center">
          <p className="font-display text-sm sm:text-base tracking-widest text-bimbi-grape mb-3">
            SELAMAT DATANG DI
          </p>
          <Image
            src="/logo.png"
            alt="Bimbi Toys"
            width={800}
            height={320}
            className="mx-auto h-auto w-128 sm:w-96"
            priority
          />
          <p className="mt-4 max-w-xl mx-auto text-bimbi-ink/70">
            Ribuan mainan asli, ambil langsung di toko terdekat atau kirim ke rumah.
            Bayar gampang scan QRIS — GoPay, OVO, Dana, semua bisa!
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="#katalog"
              className="rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white shadow-[0_4px_0_var(--color-bimbi-pink-dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform"
            >
              Lihat Mainan 
            </Link>
            <Link
              href="/stores"
              className="rounded-full bg-white px-6 py-3 font-bold text-bimbi-grape border-2 border-bimbi-grape/30 hover:bg-bimbi-grape/5 transition-colors"
            >
              Cari Toko Terdekat 📍
            </Link>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4 sm:mt-0 py-6 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
            !category ? "bg-bimbi-pink text-white border-bimbi-pink" : "bg-white border-bimbi-pink/30 text-bimbi-ink hover:border-bimbi-pink"
          }`}
        >
          Semua
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/?category=${c.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
              category === c.slug ? "bg-bimbi-pink text-white border-bimbi-pink" : "bg-white border-bimbi-pink/30 text-bimbi-ink hover:border-bimbi-pink"
            }`}
          >
            {c.emoji} {c.name}
          </Link>
        ))}
      </section>

      {/* Featured shelf */}
      {!category && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-4">
          <h2 className="font-display text-2xl sm:text-3xl mb-4 text-bimbi-grape"> Lagi Hits Nih!</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                imageUrl={p.images[0]?.url ?? "https://picsum.photos/600"}
              />
            ))}
          </div>
        </section>
      )}

      {/* Full catalog */}
      <section id="katalog" className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <h2 className="font-display text-2xl sm:text-3xl mb-4 text-bimbi-grape">
          {category ? categories.find((c) => c.slug === category)?.name : "Semua Mainan"} 
        </h2>
        {products.length === 0 ? (
          <p className="text-bimbi-ink/60">Belum ada mainan di kategori ini. Coba lihat kategori lain, yuk!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                imageUrl={p.images[0]?.url ?? "https://picsum.photos/600"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
