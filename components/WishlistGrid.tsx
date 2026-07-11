"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatIDR } from "@/lib/format";
import ImagePlaceholder from "@/components/ImagePlaceholder";

type Item = {
  id: string;
  product: { slug: string; name: string; price: number; images: { url: string }[] };
  productId: string;
};

export default function WishlistGrid({ items }: { items: Item[] }) {
  const router = useRouter();

  async function removeFromWishlist(productId: string) {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    router.refresh();
  }

  async function moveToCart(productId: string) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    await removeFromWishlist(productId);
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl">💖</span>
        <p className="font-display text-2xl mt-4">Wishlist kamu masih kosong</p>
        <p className="text-bimbi-ink/60 mt-1">Simpan mainan impianmu di sini!</p>
        <Link href="/" className="inline-block mt-4 rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white">
          Jelajahi Mainan
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item) => (
        <div key={item.id} className="toy-shelf rounded-3xl bg-white p-3 animate-pop-in">
          <Link href={`/product/${item.product.slug}`} className="block relative aspect-square rounded-2xl overflow-hidden">
            <ImagePlaceholder className="h-full w-full" />
          </Link>
          <p className="mt-3 font-display text-sm leading-snug line-clamp-2 min-h-[2.4rem]">{item.product.name}</p>
          <p className="font-bold text-bimbi-pink-dark mt-1">{formatIDR(item.product.price)}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => moveToCart(item.productId)}
              className="flex-1 rounded-full bg-bimbi-pink px-3 py-2 text-xs font-bold text-white"
            >
              🛒 Beli
            </button>
            <button
              onClick={() => removeFromWishlist(item.productId)}
              className="rounded-full border-2 border-bimbi-ink/10 px-3 py-2 text-xs font-bold"
            >
              Hapus
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
