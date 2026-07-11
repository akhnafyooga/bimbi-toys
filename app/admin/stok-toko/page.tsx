import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/admin/EmptyState";
import StoreDeleteButton from "@/components/admin/StoreDeleteButton";

export default async function AdminStoresPage() {
  const stores = await prisma.storeLocation.findMany({
    include: { _count: { select: { stock: true, orders: true } } },
    orderBy: { city: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Stok Toko</h1>
          <p className="text-slate-500 text-sm mt-1">{stores.length} toko terdaftar.</p>
        </div>
        <Link
          href="/admin/stok-toko/baru"
          className="bg-bimbi-mint hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-md transition-colors shrink-0"
        >
          + Tambah Toko Baru
        </Link>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card">
          <EmptyState
            icon="🏬"
            message='Belum ada toko. Klik "Tambah Toko Baru" untuk mulai.'
            actionHref="/admin/stok-toko/baru"
            actionLabel="+ Tambah Toko Baru"
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {stores.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
              <p className="font-display font-bold text-slate-800">{s.name}</p>
              <p className="text-sm text-slate-500 mt-1">{s.address}</p>
              <p className="text-sm text-slate-400 mt-1">🏙️ {s.city}{s.phone ? ` · ☎️ ${s.phone}` : ""}</p>
              <p className="text-xs text-slate-400 mt-2">{s._count.stock} produk dengan data stok</p>
              <div className="mt-4 flex items-center gap-4 text-sm font-semibold">
                <Link href={`/admin/stok-toko/${s.id}/stok`} className="text-bimbi-mint hover:underline">
                  📦 Kelola Stok
                </Link>
                <Link href={`/admin/stok-toko/${s.id}`} className="text-bimbi-sky hover:underline">
                  Edit
                </Link>
                <StoreDeleteButton storeId={s.id} storeName={s.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
