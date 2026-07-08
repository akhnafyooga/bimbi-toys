import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateTimeID } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";
import { ORDERS_PER_PAGE } from "@/lib/constants";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/admin/EmptyState";
import type { OrderStatus, Prisma } from "@prisma/client";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PACKED",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const status = (sp.status as OrderStatus | undefined) || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q } },
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  const isFiltered = Boolean(q || status);

  function makeHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/pesanan${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Pesanan</h1>
        <p className="text-slate-500 text-sm mt-1">{total} pesanan ditemukan.</p>
      </div>

      <form className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl shadow-card p-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari no. pesanan atau nama pelanggan..."
          className="flex-1 min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
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
        {orders.length === 0 ? (
          <EmptyState
            icon={isFiltered ? "🔍" : "📦"}
            message={
              isFiltered
                ? "Tidak ada pesanan yang cocok dengan pencarian kamu."
                : "Belum ada pesanan masuk. Pesanan baru akan muncul di sini."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">No. Pesanan</th>
                  <th className="px-4 py-3 font-semibold">Pelanggan</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pesanan/${o.id}`} className="font-semibold text-bimbi-sky hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{o.user.name}</p>
                      <p className="text-xs text-slate-400">{o.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTimeID(o.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatIDR(o.total)}</td>
                    <td className="px-4 py-3">
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

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
