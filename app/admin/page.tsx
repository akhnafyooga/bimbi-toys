import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateTimeID } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS, ACTIONABLE_STATUSES, getNextStatus } from "@/lib/orderStatus";

export default async function AdminDashboardPage() {
  const [actionableOrders, recentOrders] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan toko Bimbi Toys hari ini.</p>
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
