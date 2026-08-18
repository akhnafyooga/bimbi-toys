"use client";

import { useRouter } from "next/navigation";
import { PRICE_BUCKETS, type PriceBucketKey } from "@/lib/shelf";

export type ToolbarStore = { id: string; name: string; city: string };

// Store picker + price chips + product search for the shelf browsing page.
// Everything is URL state (?toko= &harga= &q=) so the page stays shareable
// and works without JS for the chip/search parts; only the <select> needs JS.
export default function ShelfToolbar({
  stores,
  selectedStoreId,
  activePrice,
  query,
}: {
  stores: ToolbarStore[];
  selectedStoreId: string;
  activePrice?: PriceBucketKey;
  query: string;
}) {
  const router = useRouter();

  function hrefWith(overrides: { harga?: string | null; q?: string | null }) {
    const params = new URLSearchParams();
    params.set("toko", selectedStoreId);
    const harga = "harga" in overrides ? overrides.harga : (activePrice ?? null);
    const q = "q" in overrides ? overrides.q : query;
    if (harga) params.set("harga", harga);
    if (q) params.set("q", q);
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
            if (query) params.set("q", query);
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

      <div className="flex flex-col gap-4 border-y border-slate-200 py-4 md:flex-row md:items-center md:justify-between">
        {/* Price chips — plain links, shelf-aware (see lib/shelf.ts) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Harga:</span>
          <a href={hrefWith({ harga: null })} className={chipClass(!activePrice)}>
            Semua Harga
          </a>
          {PRICE_BUCKETS.map((b) => (
            <a key={b.key} href={hrefWith({ harga: b.key })} className={chipClass(activePrice === b.key)}>
              {b.label}
            </a>
          ))}
        </div>

        {/* Product search within this store's shelves */}
        <form method="get" action="/store" className="flex md:justify-end">
          <input type="hidden" name="toko" value={selectedStoreId} />
          {activePrice && <input type="hidden" name="harga" value={activePrice} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Cari mainan di toko..."
            className="w-full md:w-64 rounded-l-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-bimbi-sky focus:border-bimbi-sky"
          />
          <button
            type="submit"
            className="shrink-0 rounded-r-md bg-bimbi-sky hover:bg-blue-800 px-4 text-sm font-bold text-white transition-colors cursor-pointer"
            aria-label="Cari"
          >
            🔍
          </button>
        </form>
      </div>
    </div>
  );
}
