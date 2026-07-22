import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EmptyState from "@/components/admin/EmptyState";
import CategoryDeleteButton from "@/components/admin/CategoryDeleteButton";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Kategori</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} kategori terdaftar.</p>
        </div>
        <Link
          href="/admin/kategori/baru"
          className="bg-bimbi-mint hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-md transition-colors shrink-0"
        >
          + Tambah Kategori Baru
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState
            icon=""
            message='Belum ada kategori. Klik "Tambah Kategori Baru" untuk mulai.'
            actionHref="/admin/kategori/baru"
            actionLabel="+ Tambah Kategori Baru"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Jumlah Produk</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c._count.products}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/kategori/${c.id}`} className="text-bimbi-sky hover:underline font-semibold">
                        Edit
                      </Link>
                      <CategoryDeleteButton categoryId={c.id} categoryName={c.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
