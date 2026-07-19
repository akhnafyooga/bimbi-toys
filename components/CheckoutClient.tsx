"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatIDR } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";

type Store = { id: string; name: string; city: string; address: string };
type CartItem = {
  id: string;
  quantity: number;
  product: { name: string; price: number; images: { url: string }[] };
};

export default function CheckoutClient({
  cartItems,
  subtotal,
  stores,
  userPhone,
}: {
  cartItems: CartItem[];
  subtotal: number;
  stores: Store[];
  userPhone: string | null;
}) {
  const router = useRouter();
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "SELF_COURIER">("PICKUP");
  const [contactPhone, setContactPhone] = useState(userPhone ?? "");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [placing, setPlacing] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "paid" | "expired" | "cancelled">("waiting");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedPhone = normalizePhone(contactPhone);
  const total = subtotal;

  // Poll order status every 3 seconds while QRIS is shown
  useEffect(() => {
    if (!orderId || paymentStatus !== "waiting") return;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) return;
        const order = await res.json();

        if (order.status === "PAID") {
          setPaymentStatus("paid");
        } else if (order.status === "EXPIRED") {
          setPaymentStatus("expired");
        } else if (order.status === "CANCELLED") {
          setPaymentStatus("cancelled");
        }
      } catch {
        // Network error — silently retry on next interval
      }
    }

    // Check immediately, then every 3 seconds
    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId, paymentStatus]);

  // Auto-redirect to order page after payment confirmed
  useEffect(() => {
    if (paymentStatus === "paid" && orderId) {
      const timeout = setTimeout(() => {
        router.push(`/orders/${orderId}`);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [paymentStatus, orderId, router]);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fulfillment,
        storeId,
        contactPhone: fulfillment === "SELF_COURIER" ? normalizedPhone : undefined,
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat pesanan.");
      return;
    }
    setQrisUrl(data.qrisUrl);
    setOrderId(data.orderId);
    setPaymentStatus("waiting");
  }

  // QRIS payment screen with live status polling
  if (qrisUrl && orderId) {
    // Payment confirmed
    if (paymentStatus === "paid") {
      return (
        <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-2xl text-green-700 mb-2">Pembayaran Berhasil!</p>
          <p className="text-sm text-bimbi-ink/60 mb-6">Terima kasih, pesananmu sedang diproses.</p>
          <p className="text-xs text-bimbi-ink/40 mb-4 animate-pulse">Mengalihkan ke halaman pesanan...</p>
          <button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="w-full rounded-full bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 transition-colors"
          >
            Lihat Pesanan
          </button>
        </div>
      );
    }

    // Payment expired or cancelled
    if (paymentStatus === "expired" || paymentStatus === "cancelled") {
      return (
        <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="font-display text-2xl text-red-600 mb-2">
            {paymentStatus === "expired" ? "Pembayaran Kedaluwarsa" : "Pembayaran Dibatalkan"}
          </p>
          <p className="text-sm text-bimbi-ink/60 mb-6">Silakan buat pesanan baru untuk mencoba lagi.</p>
          <button
            onClick={() => router.push("/cart")}
            className="w-full rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white"
          >
            Kembali ke Keranjang
          </button>
        </div>
      );
    }

    // Waiting for payment — show QRIS
    return (
      <div className="mx-auto max-w-md text-center rounded-3xl bg-white toy-shelf p-8">
        <p className="font-display text-2xl text-bimbi-pink-dark mb-2">Scan buat Bayar!</p>
        <p className="text-sm text-bimbi-ink/60 mb-4">Total: <span className="font-bold">{formatIDR(total)}</span></p>
        <div className="relative mx-auto h-64 w-64 rounded-2xl overflow-hidden border-4 border-bimbi-sun">
          <Image src={qrisUrl} alt="QRIS code" fill className="object-contain bg-white" unoptimized />
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-bimbi-ink/60">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Menunggu pembayaran...
        </div>
        <p className="text-xs text-bimbi-ink/40 mt-2">
          Buka GoPay, OVO, Dana, ShopeePay, atau m-Banking, lalu scan QR di atas.
        </p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="mt-6 w-full rounded-full bg-bimbi-mint px-6 py-3 font-bold text-white"
        >
          Sudah Bayar, Cek Status
        </button>
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
              className={`chip-spring flex-1 rounded-2xl border-2 px-4 py-3 font-bold text-left transition-colors ${fulfillment === "PICKUP" ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
                }`}
            >
              🏪 Ambil di Toko
              <p className="text-xs font-normal text-bimbi-ink/50 mt-1">Gratis, ambil sendiri</p>
            </button>
            <button
              onClick={() => setFulfillment("SELF_COURIER")}
              className={`chip-spring flex-1 rounded-2xl border-2 px-4 py-3 font-bold text-left transition-colors ${fulfillment === "SELF_COURIER" ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
                }`}
            >
              🛵 Pesan Kurir Sendiri
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
              {stores.map((s) => (
                <label
                  key={s.id}
                  className={`chip-spring flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer ${storeId === s.id ? "border-bimbi-pink bg-bimbi-pink/5" : "border-bimbi-ink/10"
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
                  </div>
                </label>
              ))}
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
                        ? `✓ Kami akan hubungi kamu di +${normalizedPhone}`
                        : "Nomor belum valid — contoh: 0812-3456-7890"}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm text-amber-800">
                  <p className="font-bold">🙅 Jangan pesan kurir dulu ya!</p>
                  <p className="mt-1">
                    Tunggu sampai status pesananmu <span className="font-bold">"Siap Diambil Kurir"</span> —
                    kami kabari via WhatsApp. Alamat pickup &amp; kode pesanan baru muncul setelah barang siap.
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
              <span className="text-bimbi-ink/70">{i.product.name} x{i.quantity}</span>
              <span className="font-semibold">{formatIDR(i.product.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-bimbi-ink/10 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {fulfillment === "SELF_COURIER" && (
            <div className="flex justify-between text-sm">
              <span>Ongkir</span>
              <span className="text-bimbi-ink/60">Bayar langsung ke kurir 🛵</span>
            </div>
          )}
          <div className="flex justify-between font-display text-lg text-bimbi-pink-dark pt-2">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing || !storeId || (fulfillment === "SELF_COURIER" && !normalizedPhone)}
          className="mt-5 w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring disabled:opacity-50"
        >
          {placing ? "Membuat Pesanan..." : "Bayar dengan QRIS"}
        </button>
      </div>
    </div>
  );
}
