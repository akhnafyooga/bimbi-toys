
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRICE_BUCKETS, type PriceBucketKey } from "@/lib/shelf";
import FancySelect from "@/components/FancySelect";

export type ToolbarStore = { id: string; name: string; city: string };

// Store picker + price filters.
// Desktop: floating glass pill OVER the shelf canvas.
// Mobile: separate single-row filter bar BELOW the canvas.
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
  const [priceOpen, setPriceOpen] = useState(false);

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

  const activePriceLabel =
    PRICE_BUCKETS.find((b) => b.key === activePrice)?.label ?? "Semua";

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${active
      ? "bg-bimbi-pink text-white"
      : "bg-white/70 text-bimbi-ink hover:bg-white"
    }`;

  return (
    <>
      {/* =========================================================
          MOBILE
          Separate toolbar BELOW the canvas.
          One row by default, with price dropdown.
          ========================================================= */}
      <div className="relative z-30 block px-3 py-3 sm:hidden">
        <div className="glass-strong flex w-full items-center gap-2 rounded-2xl p-2">
          {/* Store */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              Toko
            </span>

            <FancySelect
              value={selectedStoreId}
              onChange={selectStore}
              ariaLabel="Pilih toko"
              options={stores.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              triggerClassName="
                min-w-0
                max-w-full
                flex-1
                rounded-full
                bg-white/80
                px-3 py-1.5
                text-xs
                font-bold
                text-bimbi-ink
                hover:bg-white
              "
            />
          </div>

          {/* Divider */}
          <span
            className="h-6 w-px shrink-0 bg-slate-300"
            aria-hidden
          />

          {/* Price dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPriceOpen((open) => !open)}
              aria-expanded={priceOpen}
              className="
                flex items-center gap-1.5
                rounded-full
                bg-white/80
                px-3 py-1.5
                text-xs
                font-bold
                text-bimbi-ink
                transition-colors
                hover:bg-white
              "
            >
              <span>Harga</span>

              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className={`transition-transform ${priceOpen ? "rotate-180" : ""
                  }`}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {priceOpen && (
              <div
                className="
                  absolute right-0 top-[calc(100%+8px)]
                  z-50
                  min-w-[170px]
                  rounded-2xl
                  bg-white
                  p-2
                  shadow-lg
                  ring-1 ring-black/5
                "
              >
                <a
                  href={hrefWith(null)}
                  onClick={() => setPriceOpen(false)}
                  className={`
                    block rounded-xl px-3 py-2
                    text-xs font-bold
                    ${!activePrice
                      ? "bg-bimbi-pink text-white"
                      : "text-bimbi-ink hover:bg-slate-100"
                    }
                  `}
                >
                  Semua harga
                </a>

                {PRICE_BUCKETS.map((b) => (
                  <a
                    key={b.key}
                    href={hrefWith(b.key)}
                    onClick={() => setPriceOpen(false)}
                    className={`
                      mt-0.5 block rounded-xl
                      px-3 py-2
                      text-xs font-bold
                      ${activePrice === b.key
                        ? "bg-bimbi-pink text-white"
                        : "text-bimbi-ink hover:bg-slate-100"
                      }
                    `}
                  >
                    {b.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Active price indicator */}
          <span className="hidden max-w-[90px] truncate rounded-full bg-white/60 px-2 py-1 text-[10px] font-semibold text-slate-500 xs:block">
            {activePriceLabel}
          </span>
        </div>
      </div>

      {/* =========================================================
          DESKTOP
          Original floating toolbar OVER the canvas.
          ========================================================= */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 hidden justify-center px-3 sm:flex">
        <div className="glass-strong pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full py-2 pl-4 pr-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            Toko
          </span>

          <FancySelect
            value={selectedStoreId}
            onChange={selectStore}
            ariaLabel="Pilih toko"
            options={stores.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            triggerClassName="max-w-[10rem] rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-bimbi-ink hover:bg-white"
          />

          <span
            className="hidden h-4 w-px bg-slate-300 sm:block"
            aria-hidden
          />

          <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            Harga
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <a href={hrefWith(null)} className={chipClass(!activePrice)}>
              Semua
            </a>

            {PRICE_BUCKETS.map((b) => (
              <a
                key={b.key}
                href={hrefWith(b.key)}
                className={chipClass(activePrice === b.key)}
              >
                {b.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
