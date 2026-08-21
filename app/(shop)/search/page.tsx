import Link from "next/link";
import PendingLink from "@/components/PendingLink";
import { Prisma } from "@prisma/client";
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
      { displayName: { contains: t, mode: "insensitive" as const } },
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
        relevance(b.displayName ?? b.name, b.description, query, tokens) -
        relevance(a.displayName ?? a.name, a.description, query, tokens)
    );
  }

  // No hits → "apakah maksud kamu ..." + show results for the corrected term.
  let suggestion: string | null = null;
  let suggestedProducts: typeof products = [];
  if (query && products.length === 0) {
    const names = await prisma.product.findMany({ select: { name: true, displayName: true } });
    suggestion = suggestQuery(query, buildVocab(names.map((n) => n.displayName ?? n.name)));
    if (suggestion) {
      const sTokens = tokenize(suggestion);
      suggestedProducts = await prisma.product.findMany({
        where: { AND: [categoryFilter, sTokens.length ? tokenWhere(sTokens) : {}] },
        include: INCLUDE_IMAGE,
        take: 20,
      });
      suggestedProducts = [...suggestedProducts].sort(
        (a, b) =>
          relevance(b.displayName ?? b.name, b.description, suggestion!, sTokens) -
          relevance(a.displayName ?? a.name, a.description, suggestion!, sTokens)
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

  // "Direkomendasikan untukmu" — always rendered, because a search that returns
  // nothing (or three items) otherwise leaves a mostly empty page. Picks lean
  // towards the categories the results landed in, then fill from anywhere.
  // ORDER BY RANDOM() reshuffles per request instead of per build.
  const shown = [...visible, ...suggestedProducts];
  const shownIds = new Set(shown.map((p) => p.id));
  const focusCatIds = [...new Set(shown.map((p) => p.categoryId))];

  // Over-fetch, then drop anything already on screen — cheaper and simpler than
  // binding an exclusion list into the SQL.
  const [simRows, otherRows] = await Promise.all([
    focusCatIds.length
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product"
          WHERE "categoryId" IN (${Prisma.join(focusCatIds)})
          ORDER BY RANDOM() LIMIT 40`
      : Promise.resolve([]),
    focusCatIds.length
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product"
          WHERE "categoryId" NOT IN (${Prisma.join(focusCatIds)})
          ORDER BY RANDOM() LIMIT 20`
      : prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product" ORDER BY RANDOM() LIMIT 20`,
  ]);

  const simPicks = simRows.map((r) => r.id).filter((id) => !shownIds.has(id)).slice(0, 8);
  // With no results there is no category to anchor to, so the whole row comes
  // from the random pool — otherwise a failed search shows only 4 cards, which
  // is the sparse page this panel exists to fix.
  const otherPicks = otherRows
    .map((r) => r.id)
    .filter((id) => !shownIds.has(id))
    .slice(0, simPicks.length ? 4 : 12);
  const pickIds = [...simPicks, ...otherPicks];
  const recRows = pickIds.length
    ? await prisma.product.findMany({ where: { id: { in: pickIds } }, include: INCLUDE_IMAGE })
    : [];
  // findMany ignores the id order, so restore it — that is what keeps the
  // same-category picks ahead of the unrelated ones.
  const recById = new Map(recRows.map((r) => [r.id, r]));
  const recommended = pickIds.map((id) => recById.get(id)).filter((r) => r !== undefined);

  const grid = (list: typeof products) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {list.map((p) => (
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
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-bimbi-ink mb-6">
        Hasil pencarian: {query ? `“${query}”` : ""}{" "}
        {selectedCategory ? `di kategori ${selectedCategory.name}` : ""}
      </h1>

      {products.length > 0 ? (
        <>
          {grid(visible)}
          {showN < total && (
            <div className="flex justify-center mt-8">
              <PendingLink
                href={moreHref}
                scroll={false}
                label="Muat lebih banyak produk"
                overlayLabel={null}
                className="relative font-bold text-bimbi-pink hover:underline chip-spring"
              >
                Muat lebih banyak ↓
              </PendingLink>
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
              <PendingLink
                href={`/search?q=${encodeURIComponent(suggestion)}${category ? `&category=${category}` : ""}`}
                label={`Cari ${suggestion}`}
                overlayLabel={null}
                className="relative font-extrabold text-bimbi-pink hover:underline"
              >
                {suggestion}
              </PendingLink>
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

      {recommended.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink mb-4">
            Direkomendasikan untukmu
          </h2>
          {grid(recommended)}
        </section>
      )}
    </div>
  );
}
