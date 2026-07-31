import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateTimeID } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS, ACTIONABLE_STATUSES, getNextStatus } from "@/lib/orderStatus";
import { ADMIN_GROUPS, groupCategories } from "@/lib/adminGroups";
import FillImagesButton from "@/components/admin/FillImagesButton";

const PREVIEW_PER_GROUP = 6;

export default async function AdminDashboardPage() {
  const [actionableOrders, recentOrders, categories, totalProducts] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ACTIONABLE_STATUSES } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.order.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.count(),
  ]);

  // Split categories into Mainan / Alat Tulis / Lainnya, then pull a small
  // preview of the newest products in each section.
  const grouped = groupCategories(categories);
  const previews = await Promise.all(
    ADMIN_GROUPS.map((g) =>
      prisma.product.findMany({
        where: { categoryId: { in: grouped[g].map((c) => c.id) } },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        take: PREVIEW_PER_GROUP,
      })
    )
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ringkasan pesanan dan {totalProducts} produk Bimbi Toys.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FillImagesButton />
          <Link
            href="/admin/produk/baru"
            className="bg-bimbi-pink hover:bg-bimbi-pink-dark text-white font-bold text-sm px-4 py-2.5 rounded-md transition-colors"
          >
            + Produk Baru
          </Link>
        </div>
      </div>

      {/* Orders needing action */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-card p-5">
        <h2 className="font-display font-bold text-slate-800 mb-1">Perlu Ditindaklanjuti</h2>
        <p className="text-xs text-slate-500 mb-4">Pesanan ini menunggu kamu proses lebih lanjut.</p>
        {actionableOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Tidak ada pesanan yang perlu ditindaklanjuti sekarang. Kerja bagus!
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actionableOrders.map((o) => {
              const nextAction = getNextStatus(o.status, o.fulfillment);
              return (
                <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{o.orderNumber}</p>
                    <p className="text-xs text-slate-500 truncate">{o.user.name} · {formatIDR(o.total)}</p>
                  </div>
                  <Link
                    href={`/admin/pesanan/${o.id}`}
                    className="shrink-0 bg-bimbi-pink hover:bg-bimbi-pink-dark text-white text-xs font-bold px-3 py-2 rounded-md transition-colors"
                  >
                    {nextAction?.label ?? "Lihat"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/admin/pesanan" className="mt-4 inline-block text-sm font-semibold text-bimbi-sky hover:underline">
          Lihat semua pesanan →
        </Link>
      </div>

      {/* ===== Produk, dibagi per bagian ===== */}
      {ADMIN_GROUPS.map((group, i) => {
        const cats = grouped[group];
        const count = cats.reduce((sum, c) => sum + c._count.products, 0);
        const items = previews[i];

        return (
          <div key={group} className="rounded-xl bg-white border border-slate-200 shadow-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 className="font-display font-bold text-slate-800">
                {group} <span className="text-slate-400 font-semibold text-sm">({count})</span>
              </h2>
              <Link href="/admin/produk" className="text-sm font-semibold text-bimbi-sky hover:underline">
                Kelola semua produk →
              </Link>
            </div>

            {cats.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Belum ada kategori di bagian ini.</p>
            ) : (
              <>
                {/* Category chips — each opens the full list already filtered */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {cats.map((c) => (
                    <Link
                      key={c.id}
                      href={`/admin/produk?categoryId=${c.id}`}
                      className="rounded-full border border-slate-200 bg-slate-50 hover:border-bimbi-pink hover:text-bimbi-pink px-3 py-1 text-xs font-semibold text-slate-600 transition-colors"
                    >
                      {c.name}
                      <span className="ml-1 text-slate-400">{c._count.products}</span>
                    </Link>
                  ))}
                </div>

                {/* Newest products in this section */}
                {items.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Belum ada produk di bagian ini.</p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {items.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/admin/produk/${p.id}`}
                          className="block rounded-lg border border-slate-200 hover:border-bimbi-pink transition-colors p-2"
                        >
                          <div className="relative aspect-square rounded-md overflow-hidden bg-slate-50">
                            {p.images[0]?.url ? (
                              <Image src={p.images[0].url} alt={p.name} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-slate-300">
                                Tanpa foto
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-slate-700 line-clamp-2 leading-snug">{p.name}</p>
                          <p className="text-xs font-bold text-slate-900">{formatIDR(p.price)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Recent orders */}
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h2 className="font-display font-bold text-slate-800 mb-4">Pesanan Terbaru</h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Belum ada pesanan masuk. Pesanan baru akan muncul di sini.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-semibold">No. Pesanan</th>
                  <th className="pb-2 font-semibold">Pelanggan</th>
                  <th className="pb-2 font-semibold">Tanggal</th>
                  <th className="pb-2 font-semibold">Total</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <Link href={`/admin/pesanan/${o.id}`} className="font-semibold text-bimbi-sky hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 text-slate-600">{o.user.name}</td>
                    <td className="py-2.5 text-slate-500">{formatDateTimeID(o.createdAt)}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{formatIDR(o.total)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ORDER_STATUS_BADGE_CLASS[o.status]}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
