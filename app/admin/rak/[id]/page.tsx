import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShelfForm from "@/components/admin/ShelfForm";
import ShelfProductsEditor from "@/components/admin/ShelfProductsEditor";

export default async function AdminEditShelfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [shelf, stores, categories] = await Promise.all([
    prisma.shelf.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { product: { select: { id: true, name: true, displayName: true, price: true } } },
        },
      },
    }),
    prisma.storeLocation.findMany({ orderBy: { name: "asc" } }),
    prisma.shelfCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  if (!shelf) notFound();

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/rak" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          ← Kembali ke Rak Toko
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate-800 mt-2">
          {shelf.name} <span className="text-slate-400 font-semibold">— Rak {shelf.code}</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">Ubah detail rak, atur rentang harga yang tampil, atau catat produk di dalamnya.</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Detail Rak</h2>
        <ShelfForm
          stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          shelf={{
            id: shelf.id,
            name: shelf.name,
            code: shelf.code,
            storeId: shelf.storeId,
            categoryId: shelf.categoryId,
            description: shelf.description,
            image: shelf.image,
            position: shelf.position,
            active: shelf.active,
          }}
        />
      </section>

      <section id="produk" className="space-y-4 scroll-mt-24">
        <h2 className="font-display text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
          Harga &amp; Produk Rak
        </h2>
        <ShelfProductsEditor
          shelfId={shelf.id}
          initialPriceMin={shelf.priceMin}
          initialPriceMax={shelf.priceMax}
          initialItems={shelf.products.map((ps) => ({
            productId: ps.product.id,
            name: ps.product.displayName ?? ps.product.name,
            price: ps.product.price,
          }))}
        />
      </section>
    </div>
  );
}
