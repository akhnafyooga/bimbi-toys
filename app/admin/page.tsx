import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateTimeID } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS, ACTIONABLE_STATUSES, getNextStatus } from "@/lib/orderStatus";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

// Anything that isn't still waiting for the customer to pay (or that fell
// through) counts as revenue — order status keeps moving past "PAID" as
// staff advance fulfillment, so we can't just sum status === "PAID".
const REVENUE_STATUSES = ["PAID", "PACKED", "SHIPPED", "READY_FOR_PICKUP", "COMPLETED"] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = startOfToday();
  d.setDate(d.getDate() - 6);
  return d;
}

export default async function AdminDashboardPage() {
  const [ordersToday, ordersThisWeek, revenueOrders, actionableOrders, lowStockProducts, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday() } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfWeek() } } }),
      prisma.order.findMany({
        where: { status: { in: [...REVENUE_STATUSES] } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { status: { in: ACTIONABLE_STATUSES } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stock: "asc" },
        take: 5,
      }),
      prisma.order.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const revenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);

  const cards = [
    { label: "Pesanan Hari Ini", value: ordersToday, icon: "📅" },
    { label: "Pesanan 7 Hari Terakhir", value: ordersThisWeek, icon: "🗓️" },
    { label: "Pendapatan (belum batal)", value: formatIDR(revenue), icon: "💰" },
    { label: "Perlu Ditindaklanjuti", value: actionableOrders.length, icon: "⏳", accent: actionableOrders.length > 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan toko Bimbi Toys hari ini.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl bg-white border shadow-card p-4 sm:p-5 ${c.accent ? "border-bimbi-pink/40 ring-1 ring-bimbi-pink/20" : "border-slate-200"}`}
          >
            <div className="text-2xl">{c.icon}</div>
            <p className="mt-2 text-xl sm:text-2xl font-display font-bold text-slate-800">{c.value}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders needing action */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-card p-5">
          <h2 className="font-display font-bold text-slate-800 mb-1">🔔 Perlu Ditindaklanjuti</h2>
          <p className="text-xs text-slate-500 mb-4">Pesanan ini menunggu kamu proses lebih lanjut.</p>
          {actionableOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Tidak ada pesanan yang perlu ditindaklanjuti sekarang. Kerja bagus! 🎉
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

        {/* Low stock */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-card p-5">
          <h2 className="font-display font-bold text-slate-800 mb-1">📉 Stok Hampir Habis</h2>
          <p className="text-xs text-slate-500 mb-4">Produk dengan stok {LOW_STOCK_THRESHOLD} atau kurang.</p>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Semua stok produk masih aman. 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <p className="font-semibold text-sm text-slate-800 truncate">{p.name}</p>
                  <span className="shrink-0 bg-bimbi-pink/10 text-bimbi-pink-dark text-xs font-bold px-2.5 py-1 rounded-full">
                    Sisa {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/produk" className="mt-4 inline-block text-sm font-semibold text-bimbi-sky hover:underline">
            Kelola produk →
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h2 className="font-display font-bold text-slate-800 mb-4">🧾 Pesanan Terbaru</h2>
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
