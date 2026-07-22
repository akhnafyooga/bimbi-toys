"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isContactReady, waLink, type StoreContact } from "@/lib/storeContacts";
import AppIcon from "@/components/AppIcon";

export default function ProductActions({
  productId,
  productName,
  isLoggedIn,
  initialWishlisted,
  stock,
  stores,
}: {
  productId: string;
  productName: string;
  isLoggedIn: boolean;
  initialWishlisted: boolean;
  stock: number;
  stores: StoreContact[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState<"cart" | "wishlist" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showStores, setShowStores] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);

  // Anyone not signed in is sent to login and returned here afterwards.
  function requireLogin() {
    if (isLoggedIn) return false;
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    return true;
  }

  async function addToCart() {
    if (requireLogin()) return;
    setLoading("cart");
    setMessage(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
    });
    setLoading(null);
    if (res.ok) {
      setShowCartPopup(true);
      router.refresh();
    } else {
      setMessage("Gagal menambah ke keranjang.");
    }
  }

  async function toggleWishlist() {
    if (requireLogin()) return;
    setLoading("wishlist");
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setLoading(null);
    if (res.ok) {
      const data = await res.json();
      setWishlisted(data.wishlisted);
      router.refresh();
    }
  }

  function openStores() {
    if (requireLogin()) return;
    setShowStores((v) => !v);
  }

  const waMessage = `Halo Bimbi Toys, saya mau tanya soal produk "${productName}".`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border-2 border-bimbi-ink/10 overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="btn-press px-3 py-2 font-bold hover:bg-bimbi-cream"
          >
            −
          </button>
          <span className="px-4 font-bold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="btn-press px-3 py-2 font-bold hover:bg-bimbi-cream"
          >
            +
          </button>
        </div>
        <span className="text-sm text-bimbi-ink/60">{stock} stok tersedia</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={addToCart}
          disabled={loading !== null || stock === 0}
          className="w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring disabled:opacity-50"
        >
          {stock === 0 ? "Stok Habis" : loading === "cart" ? "Menambah..." : "Masuk Keranjang"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={openStores}
            className="flex-1 flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-bold text-[#128C7E] hover:border-[#25D366] transition-colors chip-spring"
            title="Hubungi toko terdekat via WhatsApp"
          >
            WhatsApp
          </button>
          <button
            onClick={toggleWishlist}
            disabled={loading !== null}
            className="btn-press rounded-full border border-slate-300 px-4 py-2.5 text-lg hover:border-bimbi-pink transition-colors"
            title="Simpan ke wishlist"
          >
            {/* key retriggers the pop animation on every toggle; the heart
                icon dims when the product isn't wishlisted yet */}
            <span
              key={String(wishlisted)}
              className={`inline-block animate-heart-pop ${wishlisted ? "" : "opacity-30 grayscale"}`}
            >
              <AppIcon name="wishlist" size={20} />
            </span>
          </button>
        </div>
      </div>

      {/* Nearest-store WhatsApp chooser */}
      {showStores && (
        <div className="mt-10 rounded-2xl border-2 border-[#25D366]/30 bg-white p-3 animate-pop-in">
          <p className="px-1 pb-2 text-sm font-semibold text-bimbi-ink/70">
            Pilih toko terdekat untuk chat via WhatsApp:
          </p>
          <ul className="space-y-1">
            {stores.map((store, i) => {
              const ready = isContactReady(store.whatsapp);
              return (
                <li key={store.id} className="animate-rise-in" style={{ animationDelay: `${i * 70}ms` }}>
                  {ready ? (
                    <a
                      href={waLink(store.whatsapp, waMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-[#25D366]/10 transition-colors"
                    >
                      <span>
                        <span className="font-semibold text-bimbi-ink">{store.name}</span>
                        <span className="block text-xs text-bimbi-ink/50">{store.area}</span>
                      </span>
                      <span className="text-sm font-bold text-[#128C7E]">Chat →</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl px-3 py-2 opacity-50">
                      <span>
                        <span className="font-semibold text-bimbi-ink">{store.name}</span>
                        <span className="block text-xs text-bimbi-ink/50">{store.area}</span>
                      </span>
                      <span className="text-xs text-bimbi-ink/40">Segera hadir</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && <p className="text-sm font-semibold text-bimbi-mint">{message}</p>}

      {/* Added-to-cart confirmation popup */}
      {showCartPopup && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-bimbi-ink/40 p-4"
          onClick={() => setShowCartPopup(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="animate-pop-in w-full max-w-sm rounded-3xl border-2 border-bimbi-pink/20 bg-white p-6 text-center shadow-xl"
          >
            <div className="animate-cart-hop flex justify-center">
              <AppIcon name="cart" size={48} />
            </div>
            <p className="mt-3 font-bold text-bimbi-ink">
              Berhasil ditambahkan ke keranjang!
            </p>
            <p className="mt-1 text-sm text-bimbi-ink/70">
              Apakah kamu ingin melihat keranjangmu sekarang?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowCartPopup(false);
                  router.push("/cart");
                }}
                className="rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring"
              >
                Lihat Keranjang
              </button>
              <button
                onClick={() => setShowCartPopup(false)}
                className="rounded-full px-6 py-2 text-sm font-semibold text-bimbi-ink/60 hover:bg-bimbi-cream transition-colors"
              >
                Lanjut Belanja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
