"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran ",
  PAID: "Sudah Dibayar ",
  PACKED: "Sedang Dikemas ",
  SHIPPED: "Dalam Pengiriman ",
  READY_FOR_PICKUP: "Siap Diambil di Toko ",
  COMPLETED: "Selesai ",
  CANCELLED: "Dibatalkan ",
  EXPIRED: "Kedaluwarsa ",
};

// Buyer-arranged courier orders read differently at a few stages.
const SELF_COURIER_LABEL: Record<string, string> = {
  PAID: "Sedang Disiapkan ",
  PACKED: "Sedang Disiapkan ",
  READY_FOR_PICKUP: "Siap Diambil Kurir ",
};

type OrderData = {
  orderNumber: string;
  status: string;
  total: number;
  fulfillment: "PICKUP" | "SHIPPING" | "SELF_COURIER";
  store?: { name: string; address: string; city: string } | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-full bg-bimbi-mint px-3 py-1 text-xs font-bold text-white btn-press"
    >
      {copied ? "Tersalin! ✓" : "Salin "}
    </button>
  );
}

export default function OrderStatus({ orderId, initialOrder }: { orderId: string; initialOrder: OrderData }) {
  const [order, setOrder] = useState(initialOrder);

  const isSelfCourier = order.fulfillment === "SELF_COURIER";
  // Self-courier orders keep polling after payment so the pickup panel
  // unlocks live the moment staff mark the order ready.
  const stillMoving =
    order.status === "PENDING_PAYMENT" ||
    (isSelfCourier && ["PAID", "PACKED"].includes(order.status));

  useEffect(() => {
    if (!stillMoving) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder((prev) => ({ ...prev, status: data.status, store: data.store ?? prev.store }));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [orderId, stillMoving]);

  const label =
    (isSelfCourier ? SELF_COURIER_LABEL[order.status] : undefined) ??
    STATUS_LABEL[order.status] ??
    order.status;

  const selfCourierLocked = isSelfCourier && ["PAID", "PACKED"].includes(order.status);
  const selfCourierReady = isSelfCourier && order.status === "READY_FOR_PICKUP" && order.store;
  const storeFullAddress = order.store ? `${order.store.name}, ${order.store.address}, ${order.store.city}` : "";

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white toy-shelf p-8">
      <div className="text-center">
        <p className="font-display text-2xl">{order.orderNumber}</p>
        <p className="mt-2 text-lg font-bold text-bimbi-grape">{label}</p>
        <p className="mt-2 text-bimbi-ink/60">Total: {formatIDR(order.total)}</p>
        {order.status === "PENDING_PAYMENT" && (
          <p className="mt-4 text-xs text-bimbi-ink/40">Halaman ini otomatis update begitu pembayaran diterima...</p>
        )}
      </div>

      {/* Buyer-arranged courier: locked while packing... */}
      {selfCourierLocked && (
        <div className="mt-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">Jangan pesan kurir dulu ya!</p>
          <p className="mt-1">
            Pesananmu lagi disiapkan. Alamat pickup &amp; kode pesanan muncul di sini begitu barang siap —
            halaman ini update otomatis, dan kami kabari juga via WhatsApp.
          </p>
        </div>
      )}

      {/* ...unlocked once staff mark it ready */}
      {selfCourierReady && (
        <div className="mt-6 rounded-2xl border-2 border-bimbi-mint/40 bg-emerald-50 p-4 text-sm animate-pop-in">
          <p className="font-bold text-emerald-800"> Barang siap! Silakan pesan GoSend/GrabExpress sekarang.</p>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/70">Alamat pickup</p>
              <CopyButton text={storeFullAddress} />
            </div>
            <p className="mt-1 font-semibold text-bimbi-ink">{order.store!.name}</p>
            <p className="text-bimbi-ink/70">
              {order.store!.address}, {order.store!.city}
            </p>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/70">
                Kode pesanan — kasih tahu ke kurir
              </p>
              <CopyButton text={order.orderNumber} />
            </div>
            <p className="mt-1 font-display text-xl text-bimbi-pink-dark">{order.orderNumber}</p>
          </div>

          <p className="mt-3 text-xs text-emerald-800/70">
            Jadikan alamat di atas sebagai titik <span className="font-bold">pickup</span> di aplikasi Gojek/Grab,
            dan alamatmu sebagai tujuan. Ongkir dibayar langsung ke kurir.
          </p>
        </div>
      )}
    </div>
  );
}
