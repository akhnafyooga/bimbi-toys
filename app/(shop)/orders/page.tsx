import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { ORDER_STATUS_BADGE_CLASS, orderStatusLabel } from "@/lib/orderStatus";

// Buyer-facing "Pesanan Saya": every order the signed-in user has placed, with a
// simple progress bar so they can see where each one is in the flow.

const STEPS = ["Dipesan", "Dikonfirmasi", "Dikemas", "Siap", "Selesai"];

// Map an order status onto a 0–4 step (or -1 for cancelled/expired).
function stepOf(status: OrderStatus): number {
  switch (status) {
    case "PENDING_PAYMENT": return 0;
    case "PAID": return 1;
    case "PACKED": return 2;
    case "SHIPPED":
    case "READY_FOR_PICKUP": return 3;
    case "COMPLETED": return 4;
    default: return -1; // CANCELLED / EXPIRED
  }
}

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/orders");
  const userId = (session.user as { id: string }).id;

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      store: true,
      items: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-6">Pesanan Saya</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-bimbi-ink/60">Kamu belum punya pesanan.</p>
          <Link href="/#katalog" className="inline-block mt-4 font-bold text-bimbi-pink hover:underline">
            Mulai belanja →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const step = stepOf(o.status);
            const ended = step === -1;
            return (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {/* header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="font-bold text-bimbi-ink">{o.orderNumber}</p>
                    <p className="text-xs text-slate-400">
                      {/* Real checkout timestamp — day, date & time, in WIB */}
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        timeZone: "Asia/Jakarta",
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {" · "}
                      {new Date(o.createdAt).toLocaleTimeString("id-ID", {
                        timeZone: "Asia/Jakarta",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_BADGE_CLASS[o.status]}`}>
                    {orderStatusLabel(o.status, o.fulfillment)}
                  </span>
                </div>

                {/* progression */}
                {ended ? (
                  <p className="mb-4 text-sm font-semibold text-slate-500">
                    Pesanan ini {o.status === "EXPIRED" ? "kedaluwarsa" : "dibatalkan"}.
                  </p>
                ) : (
                  <div className="mb-4">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-bimbi-mint transition-all"
                        style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between">
                      {STEPS.map((label, i) => (
                        <span
                          key={label}
                          className={`text-[10px] ${i === step ? "font-bold text-bimbi-ink" : "text-slate-400"}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* items */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-bimbi-ink/70 mb-3">
                  {o.items.map((it) => (
                    <span key={it.id}>
                      {it.product.name} <span className="text-slate-400">×{it.quantity}</span>
                    </span>
                  ))}
                </div>

                {/* footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-display text-lg text-bimbi-pink-dark">{formatIDR(o.total)}</span>
                  <Link href={`/orders/${o.id}`} className="text-sm font-bold text-bimbi-pink hover:underline">
                    Lihat detail →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
