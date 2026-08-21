import type { Metadata } from "next";
import PendingLink from "@/components/PendingLink";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { shelfPriceRange } from "@/lib/shelf";
import { normalizePhone } from "@/lib/phone";
import ShelfProductList from "@/components/shelf/ShelfProductList";
import type { ShelfProductRowData } from "@/components/shelf/ShelfProductRow";
import ShelfPhotoViewer from "@/components/shelf/ShelfPhotoViewer";

async function getShelf(id: string) {
  return prisma.shelf.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, city: true, phone: true } },
      category: { select: { name: true } },
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              displayName: true,
              slug: true,
              price: true,
              stock: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    select: { name: true, code: true, description: true },
  });
  if (!shelf) return { title: "Rak tidak ditemukan" };
  return {
    title: `${shelf.name} — Rak ${shelf.code}`,
    description:
      shelf.description ??
      `Mainan yang tersedia di rak ${shelf.code} (${shelf.name}) Bimbi Toys.`,
  };
}

export default async function ShelfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = await getShelf(id);
  if (!shelf || !shelf.active) notFound();

  const prices = shelf.products.map((ps) => ps.product.price);
  const range = shelfPriceRange(prices);

  // Availability reflects this shelf's store when per-store stock rows exist;
  // otherwise the product's global stock (stock tracking per store is optional).
  const stockRows = shelf.products.length
    ? await prisma.storeStock.findMany({
        where: { storeId: shelf.storeId, productId: { in: shelf.products.map((ps) => ps.productId) } },
        select: { productId: true, quantity: true },
      })
    : [];
  const stockByProduct = new Map(stockRows.map((r) => [r.productId, r.quantity]));

  const products: ShelfProductRowData[] = shelf.products.map((ps) => ({
    productId: ps.product.id,
    slug: ps.product.slug,
    name: ps.product.displayName ?? ps.product.name,
    categoryName: ps.product.category.name,
    price: ps.product.price,
    globalStock: ps.product.stock,
    storeStock: stockByProduct.get(ps.productId) ?? null,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14 space-y-8">
        <PendingLink
          href={`/store?toko=${shelf.store.id}`}
          label="Kembali ke daftar rak"
          overlayLabel={null}
          className="relative inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Kembali
        </PendingLink>

        {/* Interactive shelf photo — zoom, pan, circle a product, ask the store */}
        {shelf.image && (
          <ShelfPhotoViewer
            shelfId={shelf.id}
            image={shelf.image}
            code={shelf.code}
            name={shelf.name}
            storeName={shelf.store.name}
            whatsapp={normalizePhone(shelf.store.phone ?? "") ?? ""}
          />
        )}

        {/* Shelf masthead */}
        <header className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-widest text-bimbi-pink">
            {shelf.category.name} · {shelf.store.name}
          </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-bimbi-ink leading-tight">
              {shelf.name}
            </h1>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Rak {shelf.code}</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1">
              {range && (
                <p className="text-sm font-extrabold text-bimbi-ink tabular-nums">
                  {range.min === range.max
                    ? formatIDR(range.min)
                    : `${formatIDR(range.min)} – ${formatIDR(range.max)}`}
                </p>
              )}
              <p className="text-sm text-slate-500 tabular-nums">{range?.count ?? 0} produk</p>
            </div>

            {shelf.description && (
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">{shelf.description}</p>
            )}
        </header>

        <hr className="border-slate-200" />

        {/* The products on this shelf — text-first list, no product images */}
        <section className="space-y-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-bimbi-ink">Produk di Rak Ini</h2>
            <span className="h-px flex-1 bg-slate-200" aria-hidden />
          </div>
          <ShelfProductList products={products} />
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
          Stok toko berubah sepanjang hari — pesanan akhir dikonfirmasi lewat WhatsApp toko.
        </footer>
      </div>
    </div>
  );
}
