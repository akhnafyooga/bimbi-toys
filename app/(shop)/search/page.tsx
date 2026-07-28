import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserDiscount } from "@/lib/discount";
import ProductCard from "@/components/ProductCard";
import { tokenize, relevance, buildVocab, suggestQuery } from "@/lib/search";

const INCLUDE_IMAGE = { images: { orderBy: { position: "asc" as const }, take: 1 } };

// Broad, case-insensitive match: any query token appearing in name OR description.
function tokenWhere(tokens: string[]): Prisma.ProductWhereInput {
  return {
    OR: tokens.flatMap((t) => [
      { name: { contains: t, mode: "insensitive" as const } },
      { description: { contains: t, mode: "insensitive" as const } },
    ]),
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; show?: string }>;
}) {
  const { q, category, show } = await searchParams;
  const query = (q ?? "").trim();
  const tokens = tokenize(query);
  const PAGE = 24;
  const showN = Math.min(Math.max(PAGE, Number(show) || PAGE), 2000);
  // "Harga spesial kenalan" — 0 for guests and normal customers.
  const discountPercent = await getUserDiscount();

  const selectedCategory = category
    ? await prisma.category.findUnique({ where: { slug: category } })
    : null;
  const categoryFilter: Prisma.ProductWhereInput = category ? { category: { slug: category } } : {};

  // Fetch broadly (any token), then rank by relevance so best matches lead.
  let products =
    query || category
      ? await prisma.product.findMany({
          where: { AND: [categoryFilter, tokens.length ? tokenWhere(tokens) : {}] },
          include: INCLUDE_IMAGE,
        })
      : [];

  if (query && products.length > 1) {
    products = [...products].sort(
      (a, b) =>
        relevance(b.name, b.description, query, tokens) -
        relevance(a.name, a.description, query, tokens)
    );
  }

  // No hits → "apakah maksud kamu ..." + show results for the corrected term.
  let suggestion: string | null = null;
  let suggestedProducts: typeof products = [];
  if (query && products.length === 0) {
    const names = await prisma.product.findMany({ select: { name: true } });
    suggestion = suggestQuery(query, buildVocab(names.map((n) => n.name)));
    if (suggestion) {
      const sTokens = tokenize(suggestion);
      suggestedProducts = await prisma.product.findMany({
        where: { AND: [categoryFilter, sTokens.length ? tokenWhere(sTokens) : {}] },
        include: INCLUDE_IMAGE,
        take: 20,
      });
      suggestedProducts = [...suggestedProducts].sort(
        (a, b) =>
          relevance(b.name, b.description, suggestion!, sTokens) -
          relevance(a.name, a.description, suggestion!, sTokens)
      );
    }
  }

  // Paginate the ranked results so a big match set doesn't render all at once.
  const total = products.length;
  const visible = products.slice(0, showN);
  const moreQuery = new URLSearchParams();
  if (query) moreQuery.set("q", query);
  if (category) moreQuery.set("category", category);
  moreQuery.set("show", String(showN + PAGE));
  const moreHref = `/search?${moreQuery.toString()}`;

  const grid = (list: typeof products) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {list.map((p) => (
        <ProductCard
          key={p.id}
          slug={p.slug}
          name={p.name}
          price={p.price}
          compareAtPrice={p.compareAtPrice}
          imageUrl={p.images[0]?.url ?? ""}
          discountPercent={discountPercent}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-6">
        Hasil pencarian: {query ? `“${query}”` : ""}{" "}
        {selectedCategory ? `di kategori ${selectedCategory.name}` : ""}
      </h1>

      {products.length > 0 ? (
        <>
          {grid(visible)}
          {showN < total && (
            <div className="flex justify-center mt-8">
              <Link
                href={moreHref}
                scroll={false}
                className="font-bold text-bimbi-pink hover:underline chip-spring"
              >
                Muat lebih banyak ↓
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <p className="text-bimbi-ink/70">
            Nggak ketemu hasil untuk <span className="font-bold">“{query}”</span>.
          </p>

          {suggestion && (
            <p className="text-bimbi-ink">
              Apakah maksud kamu:{" "}
              <Link
                href={`/search?q=${encodeURIComponent(suggestion)}${category ? `&category=${category}` : ""}`}
                className="font-extrabold text-bimbi-pink hover:underline"
              >
                {suggestion}
              </Link>
              ?
            </p>
          )}

          {suggestedProducts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-bimbi-ink/60">
                Menampilkan hasil untuk “{suggestion}”:
              </p>
              {grid(suggestedProducts)}
            </div>
          )}

          {!suggestion && suggestedProducts.length === 0 && (
            <p className="text-bimbi-ink/60">
              Coba kata kunci lain, atau lihat semua koleksi kami di{" "}
              <Link href="/#katalog" className="font-bold text-bimbi-pink hover:underline">
                halaman utama
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
