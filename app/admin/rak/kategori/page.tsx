import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ShelfCategoryManager from "@/components/admin/ShelfCategoryManager";

export default async function AdminShelfCategoriesPage() {
  const categories = await prisma.shelfCategory.findMany({
    include: { _count: { select: { shelves: true } } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rak" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          ← Kembali ke Rak Toko
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate-800 mt-2">Kategori Rak</h1>
        <p className="text-slate-500 text-sm mt-1">
          Kelompok untuk mengatur rak di halaman &quot;Lihat Ada Apa di Toko&quot; pelanggan — misalnya Mainan Bayi,
          Edukasi, atau Outdoor.
        </p>
      </div>

      <ShelfCategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          shelfCount: c._count.shelves,
        }))}
      />
    </div>
  );
}
