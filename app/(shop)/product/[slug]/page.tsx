import Image from "next/image";
import PendingLink from "@/components/PendingLink";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { getUserDiscount, applyDiscount } from "@/lib/discount";
import { normalizePhone } from "@/lib/phone";
import ProductActions from "@/components/ProductActions";
import ProductCard from "@/components/ProductCard";
import AppIcon from "@/components/AppIcon";
import { googleMapsUrl } from "@/lib/maps";

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

  // "Lihat Ada Apa di Toko": which physical shelves (across stores) hold this
  // product. Same product can sit on several shelves — that's the point of
  // the ProductShelf join model.
  const productShelves = await prisma.shelf.findMany({
    where: { products: { some: { productId: product.id } }, active: true },
    include: {
      store: { select: { id: true, name: true, city: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ store: { name: "asc" } }, { position: "asc" }],
  });

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

  // "Harga spesial kenalan" replaces the normal price for flagged users.
  const discountPercent = await getUserDiscount();

  // "Direkomendasikan untukmu": same-category picks first, then a few from
  // elsewhere so the row is not a dead end when a category is thin.
  // ORDER BY RANDOM() in the database reshuffles on every request and avoids
  // pulling a 500-product category into memory just to shuffle it here.
  const [similarIds, otherIds] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "categoryId" = ${product.categoryId} AND id <> ${product.id}
      ORDER BY RANDOM() LIMIT 8`,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "categoryId" <> ${product.categoryId}
      ORDER BY RANDOM() LIMIT 4`,
  ]);

  const recIds = [...similarIds.map((r) => r.id), ...otherIds.map((r) => r.id)];
  const recRows = recIds.length
    ? await prisma.product.findMany({
        where: { id: { in: recIds } },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      })
    : [];
  // findMany ignores the order of the id list, so restore it — that ordering is
  // what puts the related products ahead of the unrelated ones.
  const byId = new Map(recRows.map((r) => [r.id, r]));
  const recommended = recIds.map((id) => byId.get(id)).filter((r) => r !== undefined);
  const special = discountPercent > 0;
  const finalPrice = applyDiscount(product.price, discountPercent);

  return (
    <>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid lg:grid-cols-12 gap-8">
      {/* Gallery: thumbnail rail + main image */}
      <div className="lg:col-span-6 flex gap-3">
        {product.images.length > 1 && (
          <div className="hidden sm:flex flex-col gap-2 shrink-0">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 hover:border-bimbi-sky transition-colors"
              >
                <Image src={img.url} alt={product.displayName ?? product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          {product.images[0]?.url ? (
            <>
              <Image src={product.images[0].url} alt={product.displayName ?? product.name} fill className="object-contain bg-white" priority />
              {/* Catalogue photos are sourced from the web, not shot in-store —
                  stated on the image itself so the provenance is never implied.
                  The yellow tint is low-opacity, so backdrop-brightness darkens
                  whatever photo sits behind it; without that, white text on a
                  pale product shot would be unreadable. */}
              <p className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-lg border border-wm-yellow/50 bg-wm-yellow/25 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-white shadow-lg backdrop-blur-[2px] backdrop-brightness-[0.35]">
                <span className="font-extrabold tracking-wide text-wm-yellow">NB:</span>
                Foto produk diambil dari internet
              </p>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-7xl text-slate-200"></div>
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
            {product.category.name}
          </span>
        </div>

        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-bimbi-ink leading-snug">{product.displayName ?? product.name}</h1>

        <div className="mt-1 flex items-center gap-1 text-amber-400 text-sm">
          <span>★★★★</span><span className="text-slate-200">★</span>
          <span className="text-xs text-slate-400 ml-1">Produk asli &amp; bergaransi toko</span>
        </div>

        <h2 className="mt-6 pb-2 border-b border-slate-200 font-extrabold text-bimbi-ink">Deskripsi</h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{product.description}</p>
      </div>

      {/* Right: buy box */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-5 lg:sticky lg:top-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-3xl font-extrabold ${special ? "text-bimbi-pink" : "text-bimbi-ink"}`}>
              {formatIDR(finalPrice)}
            </span>
            {special ? (
              <span className="text-sm text-slate-400 line-through">{formatIDR(product.price)}</span>
            ) : (
              product.compareAtPrice && (
                <span className="text-sm text-slate-400 line-through">{formatIDR(product.compareAtPrice)}</span>
              )
            )}
          </div>
          {special ? (
            <p className="text-sm font-bold text-bimbi-pink mt-0.5">
              Harga spesial untukmu — potongan {discountPercent}%
            </p>
          ) : (
            savings > 0 && (
              <p className="text-sm font-bold text-bimbi-mint mt-0.5">Hemat {formatIDR(savings)}</p>
            )
          )}
          <p className="text-xs text-slate-400 mt-1">Harga saat dibeli online.</p>

          <div className="mt-4">
            <ProductActions
              productId={product.id}
              productName={product.name}
              isLoggedIn={isLoggedIn}
              initialWishlisted={wishlisted}
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
                <li key={s.id}>
                  <a
                    href={googleMapsUrl(s.store)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-600 hover:text-bimbi-pink hover:underline"
                    title="Buka di Google Maps"
                  >
                    {s.store.name} — {s.store.city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Physical shelf locations ("Lihat Ada Apa di Toko") */}
          {productShelves.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="font-extrabold text-sm text-bimbi-ink mb-2">📍 Tersedia di Rak Toko</p>
              <ul className="space-y-2 text-sm">
                {productShelves.map((shelf) => (
                  <li key={shelf.id}>
                    <span className="text-slate-500">{shelf.store.name}</span>
                    <br />
                    <PendingLink
                      href={`/store/${shelf.id}`}
                      label={`Lihat rak ${shelf.code}`}
                      overlayLabel={null}
                      className="relative font-semibold text-bimbi-pink-dark hover:underline"
                    >
                      Rak {shelf.code} — {shelf.name}
                    </PendingLink>
                  </li>
                ))}
              </ul>
              <PendingLink
                href={`/store?toko=${productShelves[0].store.id}`}
                label="Lihat di Rak"
                overlayLabel={null}
                className="relative mt-2 inline-block text-xs font-bold text-slate-500 hover:text-bimbi-pink-dark hover:underline"
              >
                Lihat di Rak →
              </PendingLink>
            </div>
          )}
        </div>
      </div>
    </div>

    {recommended.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-14">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink mb-4">
          Direkomendasikan untukmu
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {recommended.map((p) => (
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
      </section>
    )}
    </>
  );
}
