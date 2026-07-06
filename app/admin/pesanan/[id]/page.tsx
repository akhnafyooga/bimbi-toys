import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatDateTimeID } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE_CLASS, getNextStatus } from "@/lib/orderStatus";
import AdvanceOrderStatusButton from "@/components/admin/AdvanceOrderStatusButton";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      user: true,
      store: true,
      address: true,
    },
  });

  if (!order) notFound();

  const nextAction = getNextStatus(order.status, order.fulfillment);
  const isTerminal = ["COMPLETED", "CANCELLED", "EXPIRED"].includes(order.status);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{order.orderNumber}</h1>
          <p className="text-slate-500 text-sm mt-1">Dipesan {formatDateTimeID(order.createdAt)}</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${ORDER_STATUS_BADGE_CLASS[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Prominent next-action */}
      {nextAction ? (
        <div className="bg-white border border-bimbi-pink/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">🔔 Perlu ditindaklanjuti</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Klik tombol ini kalau pesanan sudah {nextAction.next === "PACKED" ? "selesai dikemas" : "diproses"}.
            </p>
          </div>
          <AdvanceOrderStatusButton orderId={order.id} nextStatus={nextAction.next} label={nextAction.label} />
        </div>
      ) : order.status === "PENDING_PAYMENT" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
          ⏳ Menunggu pelanggan menyelesaikan pembayaran. Status ini akan berubah otomatis begitu pembayaran diterima —
          tidak perlu diubah manual.
        </div>
      ) : isTerminal ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-500">
          Pesanan ini sudah {ORDER_STATUS_LABEL[order.status].toLowerCase()} — tidak ada tindakan lebih lanjut.
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-display font-bold text-slate-800 mb-3">👤 Pelanggan</h2>
          <p className="text-sm text-slate-700 font-semibold">{order.user.name}</p>
          <p className="text-sm text-slate-500">{order.user.email}</p>
          {order.user.phone && <p className="text-sm text-slate-500">{order.user.phone}</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-display font-bold text-slate-800 mb-3">
            {order.fulfillment === "PICKUP" ? "🏬 Ambil di Toko" : "🚚 Dikirim ke Alamat"}
          </h2>
          {order.fulfillment === "PICKUP" && order.store ? (
            <>
              <p className="text-sm text-slate-700 font-semibold">{order.store.name}</p>
              <p className="text-sm text-slate-500">{order.store.address}, {order.store.city}</p>
            </>
          ) : order.address ? (
            <>
              <p className="text-sm text-slate-700 font-semibold">{order.address.recipient} ({order.address.label})</p>
              <p className="text-sm text-slate-500">{order.address.phone}</p>
              <p className="text-sm text-slate-500 mt-1">
                {order.address.detail}, {order.address.district}, {order.address.city}, {order.address.province}{" "}
                {order.address.postalCode}
              </p>
              {order.shippingCourier && (
                <p className="text-sm text-slate-500 mt-1">Kurir: {order.shippingCourier}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Data tidak tersedia.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-display font-bold text-slate-800 mb-3">🧾 Item Pesanan</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-slate-800">{item.product.name}</p>
                <p className="text-xs text-slate-400">
                  {item.quantity} x {formatIDR(item.price)}
                </p>
              </div>
              <p className="font-semibold text-sm text-slate-800">{formatIDR(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatIDR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Ongkos Kirim</span>
            <span>{order.shippingCost > 0 ? formatIDR(order.shippingCost) : "Gratis"}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 text-base pt-1">
            <span>Total</span>
            <span>{formatIDR(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-display font-bold text-slate-800 mb-2">💳 Status Pembayaran</h2>
        <p className="text-xs text-slate-400 mb-2">
          Status ini diatur otomatis oleh sistem pembayaran (Midtrans) dan tidak bisa diubah manual dari sini.
        </p>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ORDER_STATUS_BADGE_CLASS[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
        {order.paidAt && (
          <p className="text-sm text-slate-500 mt-2">Dibayar pada {formatDateTimeID(order.paidAt)}</p>
        )}
      </div>
    </div>
  );
}
