"use client";

import { useState } from "react";
import PendingLink from "@/components/PendingLink";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { isContactReady, waLink } from "@/lib/storeContacts";
import { buildOrderMessage } from "@/lib/orderMessage";
import { applyDiscount } from "@/lib/discount";

type Store = { id: string; name: string; city: string; address: string; whatsapp: string };
type CartItem = {
  id: string;
  quantity: number;
  product: { name: string; displayName: string | null; price: number; images: { url: string }[] };
};

export default function CheckoutClient({
  cartItems,
  subtotal,
  stores,
  userPhone,
  discountPercent = 0,
}: {
  cartItems: CartItem[];
  subtotal: number;
  stores: Store[];
  userPhone: string | null;
  discountPercent?: number;
}) {
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "SELF_COURIER">("PICKUP");
  const [contactPhone, setContactPhone] = useState(userPhone ?? "");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderNumber: string; waHref: string } | null>(null);

  const normalizedPhone = normalizePhone(contactPhone);
  // "Harga spesial kenalan": applied per unit so it matches the catalog.
  const special = discountPercent > 0;
  const unit = (price: number) => applyDiscount(price, discountPercent);
  const total = cartItems.reduce((sum, i) => sum + unit(i.product.price) * i.quantity, 0);
  const saved = subtotal - total;
  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const storeReady = selectedStore ? isContactReady(selectedStore.whatsapp) : false;

  // Compose the order chat the buyer sends to the store's WhatsApp. Shared with
  // the order pages so a follow-up chat carries the exact same details.
  function buildMessage(orderNumber: string, store: Store): string {
    return buildOrderMessage({
      orderNumber,
      items: cartItems.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        lineTotal: unit(i.product.price) * i.quantity,
      })),
      total,
      fulfillment,
      store: { name: store.name, city: store.city },
    });
  }

  async function sendWhatsApp() {
    setError(null);
    if (!selectedStore) {
      setError("Pilih toko dulu ya.");
      return;
    }
    if (!isContactReady(selectedStore.whatsapp)) {
      setError("Toko ini belum punya nomor WhatsApp aktif. Pilih toko lain dulu ya.");
      return;
    }

    setPlacing(true);
    let res: Response;
    try {
      res = await fetch("/api/checkout/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          storeId,
          contactPhone: fulfillment === "SELF_COURIER" ? normalizedPhone : undefined,
        }),
      });
    } catch {
      setPlacing(false);
      setError("Gagal terhubung. Coba lagi ya.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPlacing(false);
      setError(data.error ?? "Gagal membuat pesanan.");
      return;
    }

    // Order is recorded + cart cleared. Show a confirmation with a reliable
    // WhatsApp button (auto-redirect could silently fail on some devices).
    const waHref = waLink(selectedStore.whatsapp, buildMessage(data.orderNumber, selectedStore));
    setPlacing(false);
    setDone({ orderNumber: data.orderNumber, waHref });
  }

  // Confirmation screen after the order is created.
  if (done) {
    return (
      <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bimbi-mint/20 text-3xl">
          🎉
        </div>
        <p className="font-display text-2xl text-bimbi-pink-dark mb-1">Pesanan dibuat!</p>
        <p className="text-sm text-bimbi-ink/60">No. Pesanan</p>
        <p className="font-bold text-bimbi-ink mb-5">{done.orderNumber}</p>

        <a
          href={done.waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] hover:bg-[#1FB356] px-6 py-3 font-extrabold text-white transition-colors chip-spring"
        >
          Buka WhatsApp untuk konfirmasi
        </a>
        <p className="text-xs text-bimbi-ink/50 mt-3">
          Kirim chat ke toko untuk konfirmasi stok &amp; pembayaran. Kalau WhatsApp
          nggak otomatis kebuka, klik tombol hijau di atas ya.
        </p>

        <PendingLink href="/orders" label="Lihat Pesanan Saya" overlayLabel={null} className="relative inline-block mt-5 font-bold text-bimbi-pink hover:underline">
          Lihat Pesanan Saya →
        </PendingLink>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Fulfillment choice */}
        <div className="rounded-2xl bg-white toy-shelf p-5">
          <p className="font-display text-lg mb-3">Cara Terima Barang</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setFulfillment("PICKUP")}
              className={`chip-spring flex-1 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${fulfillment === "PICKUP"
                ? "border-bimbi-pink bg-bimbi-sun font-extrabold text-bimbi-pink-dark ring-1 ring-bimbi-pink"
                : "border-bimbi-ink/10 font-bold hover:border-bimbi-pink/40"
                }`}
            >
              Ambil di Toko
              <p className="text-xs font-normal text-bimbi-ink/50 mt-1">Gratis, ambil sendiri</p>
            </button>
            <button
              onClick={() => setFulfillment("SELF_COURIER")}
              className={`chip-spring flex-1 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${fulfillment === "SELF_COURIER"
                ? "border-bimbi-pink bg-bimbi-sun font-extrabold text-bimbi-pink-dark ring-1 ring-bimbi-pink"
                : "border-bimbi-ink/10 font-bold hover:border-bimbi-pink/40"
                }`}
            >
              Pesan Antar
              <p className="text-xs font-normal text-bimbi-ink/50 mt-1">
                Kamu pesan GoSend/Grab sendiri, bayar ke kurir
              </p>
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white toy-shelf p-5">
          <p className="font-display text-lg mb-3">
            {fulfillment === "PICKUP" ? "Pilih Toko" : "Pilih Toko Tempat Kurir Ambil Barang"}
          </p>
          <div className="space-y-2">
            {stores.map((s) => {
              const ready = isContactReady(s.whatsapp);
              return (
                <label
                  key={s.id}
                  className={`chip-spring flex items-start gap-3 rounded-xl border-2 p-3 transition-colors ${!ready ? "opacity-60" : "cursor-pointer"
                    } ${storeId === s.id
                      ? "border-bimbi-pink bg-bimbi-sun ring-1 ring-bimbi-pink"
                      : "border-bimbi-ink/10 hover:border-bimbi-pink/40"
                    }`}
                >
                  <input
                    type="radio"
                    name="store"
                    checked={storeId === s.id}
                    onChange={() => setStoreId(s.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-sm text-bimbi-ink/60">{s.address}, {s.city}</p>
                    {!ready && (
                      <p className="text-xs font-semibold text-amber-600 mt-1">
                        Nomor WhatsApp belum tersedia — pilih toko lain
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {fulfillment === "SELF_COURIER" && (
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="contactPhone" className="font-display text-base block mb-1">
                  No. WhatsApp Kamu
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full rounded-xl border-2 border-bimbi-ink/10 px-3 py-2"
                />
                {contactPhone.trim() !== "" && (
                  <p className={`mt-1 text-xs font-semibold ${normalizedPhone ? "text-bimbi-mint" : "text-red-500"}`}>
                    {normalizedPhone
                      ? `✓ Nomormu: +${normalizedPhone}`
                      : "Nomor belum valid — contoh: 0812-3456-7890"}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm text-amber-800">
                <p className="font-bold">Jangan pesan kurir dulu ya!</p>
                <p className="mt-1">
                  Setelah kamu kirim pesanan lewat WhatsApp, toko akan konfirmasi stok &amp; kapan
                  barang siap diambil kurir. Baru pesan GoSend/Grab setelah dikabari ya.
                </p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      </div>

      {/* Order summary */}
      <div className="rounded-2xl bg-white toy-shelf p-6 h-fit">
        <p className="font-display text-xl mb-4">Ringkasan Pesanan</p>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {cartItems.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-bimbi-ink/70">{i.product.displayName ?? i.product.name} x{i.quantity}</span>
              <span className="font-semibold">{formatIDR(unit(i.product.price) * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-bimbi-ink/10 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {special && (
            <div className="flex justify-between text-sm text-bimbi-pink font-bold">
              <span>Harga spesial ({discountPercent}%)</span>
              <span>−{formatIDR(saved)}</span>
            </div>
          )}
          {fulfillment === "SELF_COURIER" && (
            <div className="flex justify-between text-sm">
              <span>Ongkir</span>
              <span className="text-bimbi-ink/60">Bayar langsung ke kurir</span>
            </div>
          )}
          <div className="flex justify-between font-display text-lg text-bimbi-pink-dark pt-2">
            <span>Total Barang</span>
            <span>{formatIDR(total)}</span>
          </div>
        </div>

        <button
          onClick={sendWhatsApp}
          disabled={
            placing ||
            !storeId ||
            !storeReady ||
            (fulfillment === "SELF_COURIER" && !normalizedPhone)
          }
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1FB356] px-6 py-3 font-extrabold text-white transition-colors chip-spring disabled:opacity-50"
        >
          {placing ? "Menyiapkan pesanan..." : "Chat untuk memesan"}
        </button>

        <p className="mt-3 text-center text-xs text-bimbi-ink/50">
          Stok &amp; pembayaran (QRIS/transfer) dikonfirmasi langsung lewat chat WhatsApp toko.
        </p>
      </div>
    </div>
  );
}
