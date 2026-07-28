import type { FulfillmentType } from "@prisma/client";
import { formatIDR } from "@/lib/format";

// The WhatsApp chat text for an order. Used at checkout AND from the order
// pages afterwards, so the buyer can always re-open the same conversation with
// the store — even if the checkout redirect never fired.

export type OrderMessageInput = {
  orderNumber: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  total: number;
  fulfillment: FulfillmentType;
  store: { name: string; city: string } | null;
  /** true when re-opening the chat later (follow-up) instead of first order */
  followUp?: boolean;
};

export function buildOrderMessage({
  orderNumber,
  items,
  total,
  fulfillment,
  store,
  followUp = false,
}: OrderMessageInput): string {
  const lines = items.map(
    (i) => `• ${i.name} x${i.quantity} — ${formatIDR(i.lineTotal)}`
  );
  const cara = store
    ? fulfillment === "SELF_COURIER"
      ? `Pesan antar, kurir saya sendiri — ambil di ${store.name} (${store.city})`
      : `Ambil di Toko — ${store.name} (${store.city})`
    : "-";

  return [
    "Halo Bimbi Toys! 🧸",
    followUp
      ? "Saya mau menanyakan pesanan saya berikut ini:"
      : "Saya mau pesan barang berikut (via website):",
    "",
    `No. Pesanan: ${orderNumber}`,
    "",
    ...lines,
    "",
    `Total barang: ${formatIDR(total)}`,
    `Cara terima: ${cara}`,
    "",
    followUp
      ? "Mohon info status pesanan saya ya. Terima kasih! 🙏"
      : "Mohon dikonfirmasi ketersediaan stok dan cara pembayarannya ya. Terima kasih! 🙏",
  ].join("\n");
}
