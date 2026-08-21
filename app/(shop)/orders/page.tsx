import Link from "next/link";
import PendingLink from "@/components/PendingLink";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { isContactReady, waLink } from "@/lib/storeContacts";
import { buildOrderMessage } from "@/lib/orderMessage";
import { ORDER_STATUS_BADGE_CLASS, orderStatusLabel, orderStepIndex } from "@/lib/orderStatus";
import OrderProgress from "@/components/OrderProgress";

// Buyer-facing "Pesanan Saya": every order the signed-in user has placed, with
// its progress and a permanent WhatsApp link back to the store.
export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/orders");
  const userId = (session.user as { id: string }).id;

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      store: true,
      items: { include: { product: true } },
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
            const step = orderStepIndex(o.status);
            const ended = step === -1;
            const wa = normalizePhone(o.store?.phone ?? "") ?? "";
            const chatHref = isContactReady(wa)
              ? waLink(
                  wa,
                  buildOrderMessage({
                    orderNumber: o.orderNumber,
                    items: o.items.map((it) => ({
                      name: it.product.name,
                      quantity: it.quantity,
                      lineTotal: it.price * it.quantity,
                    })),
                    total: o.total,
                    fulfillment: o.fulfillment,
                    store: o.store ? { name: o.store.name, city: o.store.city } : null,
                    followUp: true,
                  })
                )
              : null;

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
                    <OrderProgress step={step} />
                  </div>
                )}

                {/* items */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-bimbi-ink/70 mb-3">
                  {o.items.map((it) => (
                    <span key={it.id}>
                      {it.product.displayName ?? it.product.name} <span className="text-slate-400">×{it.quantity}</span>
                    </span>
                  ))}
                </div>

                {/* footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="font-display text-lg text-bimbi-pink-dark">{formatIDR(o.total)}</span>
                  <div className="flex items-center gap-3">
                    {chatHref && !ended && (
                      <a
                        href={chatHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-[#25D366] hover:bg-[#1FB356] px-4 py-2 text-sm font-bold text-white transition-colors chip-spring"
                      >
                        Chat toko
                      </a>
                    )}
                    <PendingLink href={`/orders/${o.id}`} label={`Detail pesanan ${o.id}`} overlayLabel={null} className="relative text-sm font-bold text-bimbi-pink hover:underline">
                      Lihat detail →
                    </PendingLink>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
