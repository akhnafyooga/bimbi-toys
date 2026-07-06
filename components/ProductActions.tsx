"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductActions({
  productId,
  isLoggedIn,
  initialWishlisted,
  stock,
}: {
  productId: string;
  isLoggedIn: boolean;
  initialWishlisted: boolean;
  stock: number;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState<"cart" | "wishlist" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function addToCart() {
    setLoading("cart");
    setMessage(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
    });
    setLoading(null);
    if (res.ok) {
      setMessage("Masuk keranjang! 🛒");
      router.refresh();
    } else {
      setMessage("Gagal menambah ke keranjang.");
    }
  }

  async function toggleWishlist() {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border-2 border-bimbi-ink/10 overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 font-bold hover:bg-bimbi-cream"
          >
            −
          </button>
          <span className="px-4 font-bold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="px-3 py-2 font-bold hover:bg-bimbi-cream"
          >
            +
          </button>
        </div>
        <span className="text-sm text-bimbi-ink/60">{stock} stok tersedia</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={addToCart}
          disabled={loading !== null || stock === 0}
          className="flex-1 rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white shadow-[0_4px_0_var(--color-bimbi-pink-dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-transform disabled:opacity-50"
        >
          {stock === 0 ? "Stok Habis" : loading === "cart" ? "Menambah..." : "Masuk Keranjang 🛒"}
        </button>
        <button
          onClick={toggleWishlist}
          disabled={loading !== null}
          className="rounded-full border-2 border-bimbi-pink/30 px-5 py-3 text-xl hover:bg-bimbi-pink/5 transition-colors"
          title="Simpan ke wishlist"
        >
          {wishlisted ? "💖" : "🤍"}
        </button>
      </div>
      {message && <p className="text-sm font-semibold text-bimbi-mint">{message}</p>}
    </div>
  );
}
