"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// One optional dropdown that reveals ALL sort + price-filter options. Collapsed
// by default (sorting/filtering is opt-in). Everything drives the URL
// (?sort/&min/&max) so the server re-queries; changing a filter resets pagination.

const SORTS: { value: string; label: string }[] = [
  { value: "", label: "Terbaru" },
  { value: "termurah", label: "Harga Termurah" },
  { value: "termahal", label: "Harga Termahal" },
];

const RANGES: { label: string; min: string; max: string }[] = [
  { label: "Semua", min: "", max: "" },
  { label: "< Rp25rb", min: "", max: "25000" },
  { label: "Rp25–50rb", min: "25000", max: "50000" },
  { label: "Rp50–100rb", min: "50000", max: "100000" },
  { label: "Rp100–250rb", min: "100000", max: "250000" },
  { label: "> Rp250rb", min: "250000", max: "" },
];

export default function CatalogControls({
  category,
  sort,
  min,
  max,
  basePath = "/",
  extraParams,
}: {
  category?: string;
  sort?: string;
  min?: string;
  max?: string;
  /** Route the filters apply to — "/search" reuses this component there. */
  basePath?: string;
  /** Params that must survive the navigation, e.g. { q } on the search page. */
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cmin, setCmin] = useState(min ?? "");
  const [cmax, setCmax] = useState(max ?? "");
  const ref = useRef<HTMLDivElement>(null);

  // Close the panel when clicking outside it.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function push(sortV: string, minV: string, maxV: string) {
    const p = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v) p.set(k, v);
      }
    }
    if (category) p.set("category", category);
    if (sortV) p.set("sort", sortV);
    if (minV) p.set("min", minV);
    if (maxV) p.set("max", maxV);
    const qs = p.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    setOpen(false);
  }

  const activeRange = (r: { min: string; max: string }) =>
    (min ?? "") === r.min && (max ?? "") === r.max;
  const sortLabel = SORTS.find((s) => s.value === (sort ?? ""))?.label ?? "Terbaru";
  const isActive = Boolean(sort || min || max);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
          isActive
            ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
            : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
        }`}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Urutkan &amp; Filter
        {isActive && <span className="h-2 w-2 rounded-full bg-bimbi-pink" />}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[280px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-4">
          {/* Sort */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-bimbi-ink/50 mb-2">Urutkan</p>
            <div className="flex flex-col gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => push(s.value, min ?? "", max ?? "")}
                  className={`text-left rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    (sort ?? "") === s.value
                      ? "bg-bimbi-sun text-bimbi-pink-dark"
                      : "text-bimbi-ink hover:bg-bimbi-cream"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Price */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-bimbi-ink/50 mb-2">Harga</p>
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    setCmin(r.min);
                    setCmax(r.max);
                    push(sort ?? "", r.min, r.max);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeRange(r)
                      ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
                      : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                value={cmin}
                onChange={(e) => setCmin(e.target.value)}
                placeholder="Min"
                className="w-full rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-bimbi-pink"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                inputMode="numeric"
                value={cmax}
                onChange={(e) => setCmax(e.target.value)}
                placeholder="Max"
                className="w-full rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-bimbi-pink"
              />
              <button
                type="button"
                onClick={() => push(sort ?? "", cmin.trim(), cmax.trim())}
                className="shrink-0 rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-4 py-1.5 text-sm font-bold text-white transition-colors"
              >
                OK
              </button>
            </div>
          </div>

          {isActive && (
            <button
              type="button"
              onClick={() => {
                setCmin("");
                setCmax("");
                push("", "", "");
              }}
              className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Reset ({sortLabel})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
