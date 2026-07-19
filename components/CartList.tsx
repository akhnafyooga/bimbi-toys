"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatIDR } from "@/lib/format";
import ImagePlaceholder from "@/components/ImagePlaceholder";

type Item = {
  id: string;
  productId: string;
  quantity: number;
  product: { name: string; slug: string; price: number; stock: number; images: { url: string }[] };
};

export default function CartList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function updateQty(productId: string, quantity: number) {
    setPending(productId);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    setPending(null);
    router.refresh();
  }

  async function remove(productId: string) {
    setPending(productId);
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setPending(null);
    router.refresh();
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl">🛒</span>
        <p className="font-display text-2xl mt-4">Keranjang kamu masih kosong</p>
        <p className="text-bimbi-ink/60 mt-1">Yuk cari mainan favoritmu!</p>
        <Link href="/" className="inline-block mt-4 rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white">
          Belanja Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-2xl bg-white toy-shelf p-4">
            <div className="relative h-24 w-24 rounded-xl overflow-hidden shrink-0">
              <ImagePlaceholder className="h-full w-full" />
            </div>
            <div className="flex-1">
              <Link href={`/product/${item.product.slug}`} className="font-display text-lg hover:text-bimbi-pink-dark">
                {item.product.name}
              </Link>
              <p className="font-bold text-bimbi-pink-dark mt-1">{formatIDR(item.product.price)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center rounded-full border-2 border-bimbi-ink/10 overflow-hidden">
                  <button
                    disabled={pending === item.productId}
                    onClick={() => updateQty(item.productId, Math.max(1, item.quantity - 1))}
                    className="px-2.5 py-1 font-bold hover:bg-bimbi-cream"
                  >
                    −
                  </button>
                  <span className="px-3 text-sm font-bold">{item.quantity}</span>
                  <button
                    disabled={pending === item.productId}
                    onClick={() => updateQty(item.productId, Math.min(item.product.stock, item.quantity + 1))}
                    className="px-2.5 py-1 font-bold hover:bg-bimbi-cream"
                  >
                    +
                  </button>
                </div>
                <button
                  disabled={pending === item.productId}
                  onClick={() => remove(item.productId)}
                  className="text-sm font-bold text-red-400 hover:text-red-500"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white toy-shelf p-6 h-fit">
        <p className="font-display text-xl mb-4">Ringkasan Belanja</p>
        <div className="flex justify-between text-sm mb-2">
          <span>Subtotal</span>
          <span className="font-bold">{formatIDR(total)}</span>
        </div>
        <p className="text-xs text-bimbi-ink/50 mb-4">Ongkir dihitung di halaman checkout</p>
        <Link
          href="/checkout"
          className="block text-center w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-6 py-3 font-extrabold text-white transition-colors chip-spring"
        >
          Checkout Sekarang
        </Link>
      </div>
    </div>
  );
}
