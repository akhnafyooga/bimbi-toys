import { prisma } from "@/lib/prisma";
import { formatDateID } from "@/lib/format";
import { CUSTOMERS_PER_PAGE } from "@/lib/constants";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/admin/EmptyState";
import type { Prisma } from "@prisma/client";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * CUSTOMERS_PER_PAGE,
      take: CUSTOMERS_PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE));

  function makeHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/pelanggan${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Pelanggan</h1>
        <p className="text-slate-500 text-sm mt-1">{total} pelanggan terdaftar. Data ini hanya untuk dilihat.</p>
      </div>

      <form className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl shadow-card p-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari nama atau email pelanggan..."
          className="flex-1 min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        />
        <button type="submit" className="bg-bimbi-sky hover:bg-blue-800 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors">
          Cari
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState icon={q ? "" : ""} message={q ? "Tidak ada pelanggan yang cocok dengan pencarian kamu." : "Belum ada pelanggan yang mendaftar."} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Kontak</th>
                <th className="px-4 py-3 font-semibold">Jumlah Pesanan</th>
                <th className="px-4 py-3 font-semibold">Bergabung Sejak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{c.email}</p>
                    {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c._count.orders}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateID(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
