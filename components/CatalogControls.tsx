"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Sort + price filter for the catalog. Drives everything through the URL
// (?sort/&min/&max), so the server component re-queries. Changing a filter
// resets pagination (we simply don't carry `show`).

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
}: {
  category?: string;
  sort?: string;
  min?: string;
  max?: string;
}) {
  const router = useRouter();
  const [cmin, setCmin] = useState(min ?? "");
  const [cmax, setCmax] = useState(max ?? "");

  function push(sortV: string, minV: string, maxV: string) {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (sortV) p.set("sort", sortV);
    if (minV) p.set("min", minV);
    if (maxV) p.set("max", maxV);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  const activeRange = (r: { min: string; max: string }) =>
    (min ?? "") === r.min && (max ?? "") === r.max;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-bimbi-ink/60">Urutkan</label>
        <select
          value={sort ?? ""}
          onChange={(e) => push(e.target.value, min ?? "", max ?? "")}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-bimbi-ink outline-none cursor-pointer hover:border-bimbi-pink/50"
        >
          <option value="">Terbaru</option>
          <option value="termurah">Harga Termurah</option>
          <option value="termahal">Harga Termahal</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-bimbi-ink/60">Harga</label>
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => {
              setCmin(r.min);
              setCmax(r.max);
              push(sort ?? "", r.min, r.max);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              activeRange(r)
                ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
                : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
            }`}
          >
            {r.label}
          </button>
        ))}

        {/* Custom range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={cmin}
            onChange={(e) => setCmin(e.target.value)}
            placeholder="Min"
            className="w-20 rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-bimbi-pink"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            value={cmax}
            onChange={(e) => setCmax(e.target.value)}
            placeholder="Max"
            className="w-20 rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-bimbi-pink"
          />
          <button
            type="button"
            onClick={() => push(sort ?? "", cmin.trim(), cmax.trim())}
            className="rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-4 py-1.5 text-sm font-bold text-white transition-colors"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
