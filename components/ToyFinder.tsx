"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatIDR } from "@/lib/format";

// "Cari Mainanmu?" — gender pick + budget, then jump to the catalog below.
// It navigates to the SAME `/?segment=&max=` query the catalog already reads,
// so nothing new is needed server-side and the result is a normal, shareable
// catalog URL rather than hidden client state.
const MAX_PRICE = 300_000;
const STEP = 5_000;

export default function ToyFinder({
  initialSegment,
  initialMax,
}: {
  initialSegment?: "laki" | "perempuan";
  initialMax?: number;
}) {
  const router = useRouter();
  const [gender, setGender] = useState<"laki" | "perempuan" | null>(initialSegment ?? null);
  const [max, setMax] = useState<number>(initialMax ?? 100_000);

  const apply = () => {
    const q = new URLSearchParams();
    if (gender) q.set("segment", gender);
    q.set("max", String(max));
    router.push(`/?${q.toString()}#katalog`);
  };

  const pill = "flex-1 rounded-full px-4 py-3 text-sm font-extrabold border-2 transition-colors chip-spring";

  return (
    <section
      aria-labelledby="cari-mainanmu"
      className="rounded-2xl bg-white shadow-card border border-slate-200 p-5 sm:p-7"
    >
      <h2
        id="cari-mainanmu"
        className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink"
      >
        Cari Mainanmu?
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-1">
        Pilih untuk siapa dan berapa budgetmu — kami carikan yang pas.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-8">
        {/* Gender */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Untuk siapa?</p>
          <div className="flex gap-3">
            <button
              type="button"
              aria-pressed={gender === "laki"}
              onClick={() => setGender(gender === "laki" ? null : "laki")}
              className={`${pill} ${
                gender === "laki"
                  ? "bg-bimbi-sky text-white border-bimbi-sky"
                  : "bg-white text-bimbi-sky border-bimbi-sky/40 hover:border-bimbi-sky"
              }`}
            >
              👦 Laki-Laki
            </button>
            <button
              type="button"
              aria-pressed={gender === "perempuan"}
              onClick={() => setGender(gender === "perempuan" ? null : "perempuan")}
              className={`${pill} ${
                gender === "perempuan"
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-white text-pink-600 border-pink-300 hover:border-pink-500"
              }`}
            >
              👧 Perempuan
            </button>
          </div>
        </div>

        {/* Budget */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Budget maksimal</p>
            <p className="text-sm font-extrabold text-bimbi-ink">{formatIDR(max)}</p>
          </div>
          <input
            type="range"
            min={STEP}
            max={MAX_PRICE}
            step={STEP}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            aria-label="Budget maksimal"
            className="w-full accent-bimbi-pink cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>{formatIDR(STEP)}</span>
            <span>{formatIDR(MAX_PRICE)}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={apply}
        className="mt-6 w-full md:w-auto rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark px-8 py-3 font-extrabold text-white text-sm transition-colors chip-spring"
      >
        Cari Sekarang →
      </button>
    </section>
  );
}
