import type { FulfillmentType, OrderStatus } from "@prisma/client";

// Bimbi Toys runs a WhatsApp-confirmed flow, so a buyer only needs three steps:
//
//   Dipesan  -> filled automatically when they chat the store at checkout
//   Siap     -> staff press "Tandai Siap" in the admin panel
//   Selesai  -> staff press "Tandai Selesai" once the order is handed over
//
// The database enum still carries older payment/shipping states, so rather than
// migrating live data we MAP those statuses onto the three steps above.
export const ORDER_STEPS = ["Dipesan", "Siap", "Selesai"] as const;

// Which step (0–2) a status sits at. -1 means the order ended early.
export function orderStepIndex(status: OrderStatus): number {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PAID":
    case "PACKED":
      return 0;
    case "READY_FOR_PICKUP":
    case "SHIPPED":
      return 1;
    case "COMPLETED":
      return 2;
    default:
      return -1; // CANCELLED / EXPIRED
  }
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Dipesan",
  PAID: "Dipesan",
  PACKED: "Dipesan",
  SHIPPED: "Siap",
  READY_FOR_PICKUP: "Siap",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-amber-100 text-amber-700",
  PACKED: "bg-amber-100 text-amber-700",
  SHIPPED: "bg-sky-100 text-sky-700",
  READY_FOR_PICKUP: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-600",
  EXPIRED: "bg-slate-200 text-slate-600",
};

// Orders still waiting on staff to move them along.
export const ACTIONABLE_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PACKED",
  "READY_FOR_PICKUP",
  "SHIPPED",
];

// Status label with the fulfillment nuance spelled out where it matters.
export function orderStatusLabel(status: OrderStatus, fulfillment: FulfillmentType): string {
  if (status === "READY_FOR_PICKUP" || status === "SHIPPED") {
    return fulfillment === "SELF_COURIER" ? "Siap Diambil Kurir" : "Siap Diambil di Toko";
  }
  return ORDER_STATUS_LABEL[status];
}

// What staff can advance an order to next, and the button label to show.
// A WhatsApp order starts at PENDING_PAYMENT ("Dipesan") and staff move it
// forward by hand — there is no payment webhook in this flow, so the old
// "only Midtrans may leave PENDING_PAYMENT" rule would strand every order.
export function getNextStatus(
  status: OrderStatus,
  fulfillment: FulfillmentType
): { next: OrderStatus; label: string } | null {
  if (status === "PENDING_PAYMENT" || status === "PAID" || status === "PACKED") {
    return {
      next: "READY_FOR_PICKUP",
      label: fulfillment === "SELF_COURIER" ? "Tandai Siap Diambil Kurir" : "Tandai Siap Diambil",
    };
  }
  if (status === "READY_FOR_PICKUP" || status === "SHIPPED") {
    return { next: "COMPLETED", label: "Tandai Selesai" };
  }
  return null;
}
