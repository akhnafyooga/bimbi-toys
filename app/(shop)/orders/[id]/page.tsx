import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { isContactReady, waLink } from "@/lib/storeContacts";
import { buildOrderMessage } from "@/lib/orderMessage";
import { ORDER_STATUS_BADGE_CLASS, orderStatusLabel, orderStepIndex } from "@/lib/orderStatus";
import OrderProgress from "@/components/OrderProgress";
import CopyButton from "@/components/CopyButton";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { store: true, items: { include: { product: true } } },
  });
  if (!order || order.userId !== (session.user as { id: string }).id) notFound();

  const step = orderStepIndex(order.status);
  const ended = step === -1;

  // Buyer-arranged courier: the pickup address stays hidden until staff mark
  // the order ready, so nobody sends a courier before the goods are packed.
  const storeLocked = order.fulfillment === "SELF_COURIER" && step < 1;
  const showStore = order.store && !storeLocked;

  const wa = normalizePhone(order.store?.phone ?? "") ?? "";
  const chatHref = isContactReady(wa)
    ? waLink(
        wa,
        buildOrderMessage({
          orderNumber: order.orderNumber,
          items: order.items.map((it) => ({
            name: it.product.name,
            quantity: it.quantity,
            lineTotal: it.price * it.quantity,
          })),
          total: order.total,
          fulfillment: order.fulfillment,
          store: order.store ? { name: order.store.name, city: order.store.city } : null,
          followUp: true,
        })
      )
    : null;

  const storeFullAddress = order.store
    ? `${order.store.name}, ${order.store.address}, ${order.store.city}`
    : "";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <Link href="/orders" className="text-sm font-bold text-bimbi-pink hover:underline">
        ← Pesanan Saya
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-2xl text-bimbi-ink">{order.orderNumber}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {new Date(order.createdAt).toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WIB
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_BADGE_CLASS[order.status]}`}>
            {orderStatusLabel(order.status, order.fulfillment)}
          </span>
        </div>

        {/* progress */}
        <div className="mt-5">
          {ended ? (
            <p className="text-sm font-semibold text-slate-500">
              Pesanan ini {order.status === "EXPIRED" ? "kedaluwarsa" : "dibatalkan"}.
            </p>
          ) : (
            <OrderProgress step={step} />
          )}
        </div>

        {/* what happens next */}
        {!ended && (
          <p className="mt-4 rounded-xl bg-bimbi-cream px-4 py-3 text-sm text-bimbi-ink/80">
            {step === 0 &&
              "Pesanan kamu sudah tercatat. Toko akan mengonfirmasi ketersediaan barang & cara pembayaran lewat WhatsApp."}
            {step === 1 &&
              (order.fulfillment === "SELF_COURIER"
                ? "Barang sudah siap — silakan pesan kurir (GoSend/Grab) ke alamat pickup di bawah."
                : "Barang sudah siap — silakan ambil di toko ya!")}
            {step === 2 && "Pesanan selesai. Terima kasih sudah belanja di Bimbi Toys! 🧸"}
          </p>
        )}

        {/* items — the receipt */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-bimbi-ink/50 mb-2">Rincian Barang</p>
          <ul className="divide-y divide-slate-100">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="text-bimbi-ink">
                  {it.product.displayName ?? it.product.name}
                  <span className="text-slate-400"> ×{it.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatIDR(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-1">
            <span className="font-bold text-bimbi-ink">Total</span>
            <span className="font-display text-xl text-bimbi-pink-dark">{formatIDR(order.total)}</span>
          </div>
        </div>

        {/* fulfillment */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-bimbi-ink/50 mb-1">Cara Terima</p>
          <p className="font-semibold text-bimbi-ink">
            {order.fulfillment === "SELF_COURIER" ? "Pesan antar (kurir sendiri)" : "Ambil di Toko"}
          </p>
          {showStore && (
            <p className="text-bimbi-ink/70 mt-0.5">
              {order.store!.name} — {order.store!.address}, {order.store!.city}
            </p>
          )}
          {storeLocked && (
            <p className="text-bimbi-ink/60 mt-0.5">
              Alamat pickup muncul di sini begitu barang siap.
            </p>
          )}
        </div>

        {/* self-courier: pickup details once ready */}
        {order.fulfillment === "SELF_COURIER" && step === 1 && order.store && (
          <div className="mt-4 rounded-2xl border-2 border-bimbi-mint/40 bg-emerald-50 p-4 text-sm">
            <p className="font-bold text-emerald-800">Barang siap! Silakan pesan GoSend/GrabExpress sekarang.</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/70">Alamat pickup</p>
              <CopyButton text={storeFullAddress} />
            </div>
            <p className="mt-1 font-semibold text-bimbi-ink">{order.store.name}</p>
            <p className="text-bimbi-ink/70">
              {order.store.address}, {order.store.city}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/70">
                Kode pesanan — kasih tahu ke kurir
              </p>
              <CopyButton text={order.orderNumber} />
            </div>
            <p className="mt-1 font-display text-xl text-bimbi-pink-dark">{order.orderNumber}</p>
          </div>
        )}

        {/* the permanent WhatsApp lifeline */}
        {chatHref && (
          <a
            href={chatHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1FB356] px-6 py-3 font-extrabold text-white transition-colors chip-spring"
          >
            Chat toko via WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
