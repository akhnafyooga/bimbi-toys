"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatIDR } from "@/lib/format";
import { applyDiscount } from "@/lib/discount";
import ImagePlaceholder from "@/components/ImagePlaceholder";

type Item = {
  id: string;
  productId: string;
  quantity: number;
  product: { name: string; displayName: string | null; slug: string; price: number; stock: number; images: { url: string }[] };
};

export default function CartList({
  items,
  discountPercent = 0,
}: {
  items: Item[];
  discountPercent?: number;
}) {
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

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  // "Harga spesial kenalan" is applied per unit, matching what the cards show.
  const special = discountPercent > 0;
  const total = items.reduce(
    (sum, i) => sum + applyDiscount(i.product.price, discountPercent) * i.quantity,
    0
  );
  const savedTotal = subtotal - total;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl mt-4">Keranjang kamu masih kosong</p>
        <p className="text-bimbi-ink/60 mt-1">Yuk cari mainan favoritmu!</p>
        <Link href="/" className="inline-block mt-4 rounded-full bg-bimbi-pink px-6 py-3 font-bold text-white">
          Belanja Sekarang
        </Link>
        <p className="text-sm text-bimbi-ink/70 mt-6">
          Udah pesan?{" "}
          <Link href="/orders" className="font-bold text-bimbi-pink hover:underline">
            Lihat pesanan kamu di sini!
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      <div className="lg:col-span-2 space-y-4 min-w-0">
        {items.map((item) => (
          <div key={item.id}className="flex w-full min-w-0 gap-3 md:gap-4 rounded-2xl bg-white toy-shelf p-3 md:p-4 items-center">
            <div className="relative h-16 w-16 md:h-24 md:w-24 rounded-xl overflow-hidden shrink-0">
              <ImagePlaceholder className="h-full w-full" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <Link href={`/product/${item.product.slug}`} className="font-display text-sm md:text-lg hover:text-bimbi-pink-dark block truncate">
                {item.product.displayName ?? item.product.name}
              </Link>
              <p className="font-bold text-sm md:text-base text-bimbi-pink-dark mt-0.5 md:mt-1">
                    {formatIDR(applyDiscount(item.product.price, discountPercent))}
                    {special && (
                      <span className="ml-1.5 text-[10px] md:text-xs font-semibold text-slate-400 line-through">
                        {formatIDR(item.product.price)}
                      </span>
                    )}
                  </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center rounded-full border-2 border-bimbi-ink/10 overflow-hidden">
                  <button
                    disabled={pending === item.productId}
                    onClick={() => updateQty(item.productId, Math.max(1, item.quantity - 1))}
                    className="px-2 py-0.5 md:px-2.5 md:py-1 font-bold hover:bg-bimbi-cream text-xs md:text-sm"
                  >
                    −
                  </button>
                  <span className="px-2 md:px-3 text-xs md:text-sm font-bold">{item.quantity}</span>
                  <button
                    disabled={pending === item.productId}
                    onClick={() => updateQty(item.productId, Math.min(99, item.quantity + 1))}
                    className="px-2 py-0.5 md:px-2.5 md:py-1 font-bold hover:bg-bimbi-cream text-xs md:text-sm"
                  >
                    +
                  </button>
                </div>
                <button
                  disabled={pending === item.productId}
                  onClick={() => remove(item.productId)}
                  className="text-xs md:text-sm font-bold text-red-400 hover:text-red-500"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full rounded-2xl bg-white toy-shelf p-3 md:p-6 h-fit">
        <p className="font-display text-base md:text-xl mb-3 md:mb-4">Ringkasan Belanja</p>
        <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2">
          <span>Subtotal</span>
          <span className={special ? "" : "font-bold"}>{formatIDR(subtotal)}</span>
        </div>
        {special && (
          <>
            <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2 text-bimbi-pink">
              <span>Harga spesial ({discountPercent}%)</span>
              <span className="font-bold">−{formatIDR(savedTotal)}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm mb-1.5 md:mb-2 border-t border-bimbi-ink/10 pt-2">
              <span className="font-bold">Total</span>
              <span className="font-bold">{formatIDR(total)}</span>
            </div>
          </>
        )}
        <p className="text-[10px] md:text-xs text-bimbi-ink/50 mb-3 md:mb-4">
          Stok &amp; pembayaran dikonfirmasi lewat chat WhatsApp toko.
        </p>
        <Link
          href="/checkout"
          className="block text-center w-full rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-4 py-2 md:px-6 md:py-3 text-sm md:text-base font-extrabold text-white transition-colors chip-spring"
        >
          Lanjut Pesan via WhatsApp
        </Link>
      </div>
    </div>
  );
}
