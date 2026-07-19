import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import ProductActions from "@/components/ProductActions";
import AppIcon from "@/components/AppIcon";

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
  const savings = product.compareAtPrice ? product.compareAtPrice - product.price : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid lg:grid-cols-12 gap-8">
      {/* Gallery: thumbnail rail + main image */}
      <div className="lg:col-span-6 flex gap-3">
        {product.images.length > 1 && (
          <div className="hidden sm:flex flex-col gap-2 shrink-0">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="relative h-16 w-16 rounded-md overflow-hidden border border-slate-200 hover:border-bimbi-pink transition-colors"
              >
                <Image src={img.url} alt={product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="relative flex-1 aspect-square rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
          {product.images[0]?.url ? (
            <Image src={product.images[0].url} alt={product.name} fill className="object-contain bg-white" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl text-slate-200">🧸</div>
          )}
        </div>
      </div>

      {/* Middle: badges, title, description */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-2">
          {discount > 0 && (
            <span className="rounded-sm bg-wm-red px-2 py-0.5 text-[11px] font-extrabold text-white">
              Hemat {discount}%
            </span>
          )}
          <span className="text-xs font-bold text-bimbi-pink">
            {product.category.emoji} {product.category.name}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-extrabold text-bimbi-ink leading-snug">{product.name}</h1>

        <div className="mt-1 flex items-center gap-1 text-amber-400 text-sm">
          <span>★★★★</span><span className="text-slate-200">★</span>
          <span className="text-xs text-slate-400 ml-1">Produk asli &amp; bergaransi toko</span>
        </div>

        <h2 className="mt-6 pb-2 border-b border-slate-200 font-extrabold text-bimbi-ink">Deskripsi</h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{product.description}</p>
      </div>

      {/* Right: buy box */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-slate-200 shadow-card p-4 lg:sticky lg:top-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-extrabold text-bimbi-ink">{formatIDR(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-slate-400 line-through">{formatIDR(product.compareAtPrice)}</span>
            )}
          </div>
          {savings > 0 && (
            <p className="text-sm font-bold text-bimbi-mint mt-0.5">Hemat {formatIDR(savings)}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Harga saat dibeli online.</p>

          <div className="mt-4">
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
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="font-extrabold text-sm text-bimbi-ink mb-2 flex items-center gap-1.5">
              <AppIcon name="location" size={16} /> Ambil di Toko
            </p>
            <ul className="space-y-1 text-sm">
              {product.stockByStore.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span className="text-slate-600">{s.store.name} — {s.store.city}</span>
                  <span className={s.quantity > 0 ? "text-bimbi-mint font-bold" : "text-slate-300"}>
                    {s.quantity > 0 ? `${s.quantity} stok` : "Kosong"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
