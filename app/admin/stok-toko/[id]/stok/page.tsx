import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoreStockEditor from "@/components/admin/StoreStockEditor";
import EmptyState from "@/components/admin/EmptyState";

export default async function StoreStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await prisma.storeLocation.findUnique({ where: { id } });
  if (!store) notFound();

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { stockByStore: { where: { storeId: id } } },
  });

  const items = products.map((p) => ({
    productId: p.id,
    name: p.name,
    quantity: p.stockByStore[0]?.quantity ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Kelola Stok — {store.name}</h1>
        <p className="text-slate-500 text-sm mt-1">Atur jumlah stok tiap produk yang tersedia di toko ini.</p>
      </div>
      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card">
          <EmptyState icon="" message="Belum ada produk untuk diatur stoknya. Tambahkan produk dulu di menu Produk." />
        </div>
      ) : (
        <StoreStockEditor storeId={store.id} items={items} />
      )}
    </div>
  );
}
