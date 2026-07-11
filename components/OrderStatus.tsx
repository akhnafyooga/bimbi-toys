"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran ⏳",
  PAID: "Sudah Dibayar ✅",
  PACKED: "Sedang Dikemas 📦",
  SHIPPED: "Dalam Pengiriman 🚚",
  READY_FOR_PICKUP: "Siap Diambil di Toko 🏪",
  COMPLETED: "Selesai 🎉",
  CANCELLED: "Dibatalkan ❌",
  EXPIRED: "Kedaluwarsa ⏰",
};

type OrderData = {
  orderNumber: string;
  status: string;
  total: number;
  fulfillment: "PICKUP" | "SHIPPING";
};

export default function OrderStatus({ orderId, initialOrder }: { orderId: string; initialOrder: OrderData }) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (order.status !== "PENDING_PAYMENT") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [orderId, order.status]);

  return (
    <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
      <span className="text-5xl">{order.status === "PAID" ? "🎉" : "📦"}</span>
      <p className="font-display text-2xl mt-3">{order.orderNumber}</p>
      <p className="mt-2 text-lg font-bold text-bimbi-grape">{STATUS_LABEL[order.status] ?? order.status}</p>
      <p className="mt-2 text-bimbi-ink/60">Total: {formatIDR(order.total)}</p>
      {order.status === "PENDING_PAYMENT" && (
        <p className="mt-4 text-xs text-bimbi-ink/40">Halaman ini otomatis update begitu pembayaran diterima...</p>
      )}
    </div>
  );
}
