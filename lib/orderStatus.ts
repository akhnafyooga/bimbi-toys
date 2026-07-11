import type { FulfillmentType, OrderStatus } from "@prisma/client";

// Matches the labels already used on the customer-facing order page
// (components/OrderStatus.tsx) so staff and customers see the same wording.
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Sudah Dibayar",
  PACKED: "Sedang Dikemas",
  SHIPPED: "Dalam Pengiriman",
  READY_FOR_PICKUP: "Siap Diambil di Toko",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-sky-100 text-sky-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  READY_FOR_PICKUP: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-600",
  EXPIRED: "bg-slate-200 text-slate-600",
};

// Statuses where staff still need to do something to move the order along.
export const ACTIONABLE_STATUSES: OrderStatus[] = ["PAID", "PACKED"];

// What staff can advance an order to next, and the button label to show.
// Payment status itself (PENDING_PAYMENT -> PAID) is never in this map —
// that's set only by the Midtrans webhook, never by a staff click.
export function getNextStatus(
  status: OrderStatus,
  fulfillment: FulfillmentType
): { next: OrderStatus; label: string } | null {
  if (status === "PAID") {
    return { next: "PACKED", label: "Tandai Sudah Dikemas" };
  }
  if (status === "PACKED") {
    return fulfillment === "SHIPPING"
      ? { next: "SHIPPED", label: "Tandai Sudah Dikirim" }
      : { next: "READY_FOR_PICKUP", label: "Tandai Siap Diambil" };
  }
  if (status === "SHIPPED" || status === "READY_FOR_PICKUP") {
    return { next: "COMPLETED", label: "Tandai Selesai" };
  }
  return null;
}
