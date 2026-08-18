import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/admin/EmptyState";
import ShelfDeleteButton from "@/components/admin/ShelfDeleteButton";

export default async function AdminShelvesPage({
  searchParams,
}: {
  searchParams: Promise<{ toko?: string; q?: string }>;
}) {
  const { toko, q } = await searchParams;

  const [stores, shelves] = await Promise.all([
    prisma.storeLocation.findMany({ orderBy: { name: "asc" } }),
    prisma.shelf.findMany({
      where: {
        ...(toko ? { storeId: toko } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q.toUpperCase() } },
              ],
            }
          : {}),
      },
      include: {
        store: { select: { id: true, name: true, city: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: [{ store: { name: "asc" } }, { position: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Rak Toko</h1>
          <p className="text-slate-500 text-sm mt-1">
            Atur rak fisik yang tampil di halaman &quot;Lihat Ada Apa di Toko&quot; pelanggan.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/rak/kategori" className="text-sm font-semibold text-bimbi-sky hover:underline">
            Kelola Kategori Rak
          </Link>
          <Link
            href="/admin/rak/baru"
            className="bg-bimbi-mint hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-md transition-colors"
          >
            + Tambah Rak Baru
          </Link>
        </div>
      </div>

      {/* Store filter + search, both URL-driven */}
      <form method="get" className="flex flex-wrap gap-3 items-center">
        <select
          name="toko"
          defaultValue={toko ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        >
          <option value="">Semua toko</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.city})
            </option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama / kode rak..."
          className="flex-1 min-w-52 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        />
        <button
          type="submit"
          className="bg-bimbi-sky hover:bg-blue-800 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          Cari
        </button>
      </form>

      {shelves.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card">
          <EmptyState
            icon="🏷️"
            message={
              stores.length === 0
                ? "Belum ada toko terdaftar. Tambahkan toko dulu di menu Stok Toko."
                : 'Belum ada rak yang cocok. Klik "Tambah Rak Baru" untuk mulai.'
            }
            actionHref={stores.length === 0 ? "/admin/stok-toko" : "/admin/rak/baru"}
            actionLabel={stores.length === 0 ? "+ Tambah Toko" : "+ Tambah Rak Baru"}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Rak</th>
                <th className="px-4 py-3 font-semibold">Toko</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shelves.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Rak {s.code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.store.name}
                    <span className="block text-xs text-slate-400">{s.store.city}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.category.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s._count.products}</td>
                  <td className="px-4 py-3">
                    {s.active ? (
                      <span className="inline-block rounded bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5">
                        Tampil
                      </span>
                    ) : (
                      <span className="inline-block rounded bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5">
                        Disembunyikan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/rak/${s.id}`} className="text-bimbi-sky hover:underline font-semibold">
                        Edit
                      </Link>
                      <ShelfDeleteButton shelfId={s.id} shelfName={s.name} shelfCode={s.code} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
