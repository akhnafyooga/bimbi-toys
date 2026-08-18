import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ShelfForm from "@/components/admin/ShelfForm";

export default async function AdminNewShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ toko?: string }>;
}) {
  const { toko } = await searchParams;

  const [stores, categories] = await Promise.all([
    prisma.storeLocation.findMany({ orderBy: { name: "asc" } }),
    prisma.shelfCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rak" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          ← Kembali ke Rak Toko
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate-800 mt-2">Tambah Rak Baru</h1>
        <p className="text-slate-500 text-sm mt-1">
          Satu rak mewakili satu rak fisik di toko. Produknya diatur setelah rak dibuat.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5 sm:p-6">
        <ShelfForm
          stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          defaultStoreId={toko}
        />
      </div>
    </div>
  );
}
