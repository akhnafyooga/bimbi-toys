import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import ProductActions from "@/components/ProductActions";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [product, storeLocations] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: "asc" } },
        category: true,
        stockByStore: { include: { store: true } },
      },
    }),
    prisma.storeLocation.findMany({ orderBy: { city: "asc" } }),
  ]);

  if (!product) notFound();

  // WhatsApp chooser reads the same StoreLocation rows the admin panel edits.
  // Phones are typed free-form in the admin (e.g. "0812-3456-7890"); normalize
  // to the wa.me format here, and an empty/invalid one shows as "Segera hadir".
  const storeContacts = storeLocations.map((s) => ({
    id: s.id,
    name: s.name,
    area: `${s.address}, ${s.city}`,
    whatsapp: normalizePhone(s.phone ?? "") ?? "",
  }));

  const wishlisted = userId
    ? !!(await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
      }))
    : false;

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-10">
      {/* Gallery */}
      <div>
        <div className="toy-shelf relative aspect-square rounded-3xl overflow-hidden bg-white">
          <Image src={product.images[0]?.url ?? ""} alt={product.name} fill className="object-cover" priority />
        </div>
        {product.images.length > 1 && (
          <div className="mt-4 flex gap-3">
            {product.images.map((img) => (
              <div key={img.id} className="relative h-20 w-20 rounded-xl overflow-hidden border-2 border-bimbi-pink/20">
                <Image src={img.url} alt={product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-bold text-bimbi-sky">{product.category.emoji} {product.category.name}</p>
        <h1 className="font-display text-3xl sm:text-4xl mt-1 text-bimbi-ink">{product.name}</h1>

        <div className="mt-4">
          <div className="price-tag inline-block bg-bimbi-sun px-6 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-bimbi-ink">{formatIDR(product.price)}</span>
              {discount > 0 && (
                <span className="text-sm text-bimbi-ink/50 line-through">{formatIDR(product.compareAtPrice!)}</span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-bimbi-ink/80 leading-relaxed">{product.description}</p>

        <div className="mt-6">
          <ProductActions
            productId={product.id}
            productName={product.name}
            isLoggedIn={isLoggedIn}
            initialWishlisted={wishlisted}
            stock={product.stock}
            stores={storeContacts}
          />
        </div>

        {/* Pickup availability */}
        <div className="mt-8 rounded-2xl bg-white toy-shelf p-4">
          <p className="font-display text-lg text-bimbi-grape mb-2">📍 Ambil di Toko</p>
          <ul className="space-y-1 text-sm">
            {product.stockByStore.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.store.name} — {s.store.city}</span>
                <span className={s.quantity > 0 ? "text-bimbi-mint font-semibold" : "text-bimbi-ink/40"}>
                  {s.quantity > 0 ? `${s.quantity} stok` : "Kosong"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
