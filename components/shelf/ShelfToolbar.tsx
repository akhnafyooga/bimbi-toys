"use client";

import { useRouter } from "next/navigation";
import { PRICE_BUCKETS, type PriceBucketKey } from "@/lib/shelf";
import FancySelect from "@/components/FancySelect";

export type ToolbarStore = { id: string; name: string; city: string };

// Store picker + price chips, floating as a glass pill OVER the free-roam
// shelf board. Everything is still URL state (?toko= &harga=) so the page
// stays shareable and works without JS for the chips; only the store picker
// needs JS. (No product search — shelves don't list products; shoppers ask
// via WhatsApp instead.)
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

  function selectStore(storeId: string) {
    const params = new URLSearchParams();
    params.set("toko", storeId);
    if (activePrice) params.set("harga", activePrice);
    router.push(`/store?${params.toString()}`);
  }

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
      active ? "bg-bimbi-pink text-white" : "bg-white/70 text-bimbi-ink hover:bg-white"
    }`;

  return (
    // The wrapper spans the board but passes drags through; only the pill
    // itself is interactive, so panning can start right beside it.
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
      <div className="glass-strong pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full py-2 pl-4 pr-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
          Toko
        </span>
        <FancySelect
          value={selectedStoreId}
          onChange={selectStore}
          ariaLabel="Pilih toko"
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          triggerClassName="max-w-[10rem] rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-bimbi-ink hover:bg-white"
        />

        <span className="hidden h-4 w-px bg-slate-300 sm:block" aria-hidden />

        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Harga</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <a href={hrefWith(null)} className={chipClass(!activePrice)}>
            Semua
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
