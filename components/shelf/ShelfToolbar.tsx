"use client";

import { useRouter } from "next/navigation";
import { PRICE_BUCKETS, type PriceBucketKey } from "@/lib/shelf";

export type ToolbarStore = { id: string; name: string; city: string };

// Store picker + price chips for the shelf browsing page. Everything is URL
// state (?toko= &harga=) so the page stays shareable and works without JS for
// the chips; only the <select> needs JS. (No product search anymore — shelves
// don't list products; shoppers ask via WhatsApp instead.)
export default function ShelfToolbar({
  stores,
  selectedStoreId,
  activePrice,
}: {
  stores: ToolbarStore[];
  selectedStoreId: string;
  activePrice?: PriceBucketKey;
}) {
  const router = useRouter();

  function hrefWith(harga: string | null) {
    const params = new URLSearchParams();
    params.set("toko", selectedStoreId);
    if (harga) params.set("harga", harga);
    return `/store?${params.toString()}`;
  }

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
      active
        ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
        : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
    }`;

  return (
    <div className="space-y-5">
      {/* Store selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="shelf-store" className="text-sm font-bold text-slate-700">
          Pilih Toko
        </label>
        <select
          id="shelf-store"
          value={selectedStoreId}
          onChange={(e) => {
            const params = new URLSearchParams();
            params.set("toko", e.target.value);
            if (activePrice) params.set("harga", activePrice);
            router.push(`/store?${params.toString()}`);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-bimbi-sky focus:border-bimbi-sky cursor-pointer"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 border-y border-slate-200 py-4">
        {/* Price chips — plain links; matched against each shelf's manual
            price range (see lib/shelf.ts) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Harga:</span>
          <a href={hrefWith(null)} className={chipClass(!activePrice)}>
            Semua Harga
          </a>
          {PRICE_BUCKETS.map((b) => (
            <a key={b.key} href={hrefWith(b.key)} className={chipClass(activePrice === b.key)}>
              {b.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
