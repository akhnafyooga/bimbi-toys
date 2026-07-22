import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { LOW_STOCK_THRESHOLD, PRODUCTS_PER_PAGE } from "@/lib/constants";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/admin/EmptyState";
import ProductDeleteButton from "@/components/admin/ProductDeleteButton";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const categoryId = sp.categoryId || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, images: { orderBy: { position: "asc" as const }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const isFiltered = Boolean(q || categoryId);

  function makeHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/produk${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Produk</h1>
          <p className="text-slate-500 text-sm mt-1">{total} produk terdaftar.</p>
        </div>
        <Link
          href="/admin/produk/baru"
          className="bg-bimbi-mint hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-md transition-colors shrink-0"
        >
          + Tambah Produk Baru
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl shadow-card p-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari nama produk..."
          className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        />
        <select
          name="categoryId"
          defaultValue={categoryId}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-bimbi-sky hover:bg-blue-800 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors"
        >
          Cari
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        {products.length === 0 ? (
          isFiltered ? (
            <EmptyState icon="" message={`Tidak ada produk yang cocok dengan pencarian kamu.`} />
          ) : (
            <EmptyState
              icon=""
              message="Belum ada produk. Klik &quot;Tambah Produk Baru&quot; untuk mulai."
              actionHref="/admin/produk/baru"
              actionLabel="+ Tambah Produk Baru"
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produk</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Harga</th>
                  <th className="px-4 py-3 font-semibold">Stok</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-md bg-slate-100 overflow-hidden shrink-0">
                          {p.images[0] ? (
                            <Image src={p.images[0].url} alt={p.name} fill sizes="44px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg"></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate max-w-[220px]">{p.name}</p>
                          {p.featured && <span className="text-[10px] font-bold text-bimbi-pink-dark"> Unggulan</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.category.name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatIDR(p.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          p.stock <= LOW_STOCK_THRESHOLD ? "bg-bimbi-pink/10 text-bimbi-pink-dark" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/produk/${p.id}`} className="text-bimbi-sky hover:underline font-semibold">
                          Edit
                        </Link>
                        <ProductDeleteButton productId={p.id} productName={p.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
