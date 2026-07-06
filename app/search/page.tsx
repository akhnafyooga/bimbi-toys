import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const products = q
    ? await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-6">
        Hasil pencarian: &ldquo;{q}&rdquo; 🔍
      </h1>
      {products.length === 0 ? (
        <p className="text-bimbi-ink/60">Nggak ketemu mainan yang cocok. Coba kata kunci lain, yuk!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              compareAtPrice={p.compareAtPrice}
              imageUrl={p.images[0]?.url ?? ""}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
