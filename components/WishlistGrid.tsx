"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatIDR } from "@/lib/format";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import Loader from "@/components/Loader";
import PendingLink from "@/components/PendingLink";

type Item = {
  id: string;
  product: { slug: string; name: string; displayName: string | null; price: number; images: { url: string }[] };
  productId: string;
};

export default function WishlistGrid({ items }: { items: Item[] }) {
  const router = useRouter();
  // "productId:action" of the in-flight toggle, so each button shows its own
  // loader instead of freezing the whole grid.
  const [busy, setBusy] = useState<string | null>(null);

  async function wishlistApi(productId: string) {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  }

  async function removeFromWishlist(productId: string) {
    setBusy(`${productId}:remove`);
    await wishlistApi(productId);
    setBusy(null);
    router.refresh();
  }

  async function moveToCart(productId: string) {
    setBusy(`${productId}:cart`);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    await wishlistApi(productId);
    setBusy(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl mt-4">Wishlist kamu masih kosong</p>
        <p className="text-bimbi-ink/60 mt-1">Simpan mainan impianmu di sini!</p>
        <PendingLink href="/" label="Jelajahi Mainan" className="inline-block relative mt-4 rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white">
          Jelajahi Mainan
        </PendingLink>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item) => (
        <div key={item.id} className="toy-shelf rounded-3xl bg-white p-3 animate-pop-in">
          <PendingLink
            href={`/product/${item.product.slug}`}
            label={item.product.displayName ?? item.product.name}
            className="block relative aspect-square rounded-2xl overflow-hidden"
          >
            <ImagePlaceholder className="h-full w-full" />
          </PendingLink>
          <p className="mt-3 font-display text-sm leading-snug line-clamp-2 min-h-[2.4rem]">{item.product.displayName ?? item.product.name}</p>
          <p className="font-bold text-bimbi-pink-dark mt-1">{formatIDR(item.product.price)}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => moveToCart(item.productId)}
              disabled={busy !== null}
              className="flex-1 flex items-center justify-center rounded-full bg-bimbi-pink px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {busy === `${item.productId}:cart` ? <Loader label={null} size={4} /> : "Beli"}
            </button>
            <button
              onClick={() => removeFromWishlist(item.productId)}
              disabled={busy !== null}
              className="flex items-center justify-center rounded-full border-2 border-bimbi-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-60"
            >
              {busy === `${item.productId}:remove` ? <Loader label={null} size={4} /> : "Hapus"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
