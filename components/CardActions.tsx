"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The two interactive controls on a product card: wishlist heart and
// "Tambah ke Keranjang". They live in their own client component so the card
// itself stays a server component, and they sit OUTSIDE the card's <Link> —
// a button nested inside an anchor is invalid and swallows the click.
// Both hit the existing /api/wishlist and /api/cart routes; nothing new.
export default function CardActions({
  productId,
  wishlisted = false,
}: {
  productId: string;
  wishlisted?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(wishlisted);
  const [busy, setBusy] = useState<"cart" | "wishlist" | null>(null);
  const [added, setAdded] = useState(false);

  // Guests are sent to login and returned to where they were.
  const requireLogin = (res: Response) => {
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return true;
    }
    return false;
  };

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy("wishlist");
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setBusy(null);
    if (requireLogin(res)) return;
    if (res.ok) {
      const data = await res.json();
      setLiked(data.wishlisted);
      router.refresh();
    }
  }

  async function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy("cart");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    setBusy(null);
    if (requireLogin(res)) return;
    if (res.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleWishlist}
        aria-label={liked ? "Hapus dari wishlist" : "Simpan ke wishlist"}
        aria-pressed={liked}
        className="absolute top-2 left-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 hover:ring-bimbi-pink transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={liked ? "text-wm-red" : "text-slate-500"}
          aria-hidden
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={addToCart}
        disabled={busy === "cart"}
        className="mt-2 -mx-3 -mb-3 w-[calc(100%+1.5rem)] bg-[#f26722] hover:bg-[#d9551a] disabled:opacity-70 px-2 py-1.5 text-[11px] font-bold text-white transition-colors btn-press flex items-center justify-center gap-1"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M2 3h3l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6" />
        </svg>
        {busy === "cart" ? "Menambah…" : added ? "Ditambahkan!" : "Tambahkan"}
      </button>
    </>
  );
}
