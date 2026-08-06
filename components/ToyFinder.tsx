"use client";

import Image from "next/image";
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

  // Artwork untouched — only the cursor, a hover nudge, and a subtle lift so a
  // shopper can tell which one they picked. Drop the `on` branch if you would
  // rather have no selected state at all.
  const gp = (on: boolean) =>
    `flex-1 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 ${
      on ? "scale-[1.03] drop-shadow-lg" : ""
    }`;

  const apply = () => {
    const q = new URLSearchParams();
    if (gender) q.set("segment", gender);
    q.set("max", String(max));
    router.push(`/?${q.toString()}#katalog`);
  };


  return (
    <section
      aria-labelledby="cari-mainanmu"
      className="rounded-2xl bg-white border border-slate-200 shadow-card p-5 sm:p-7"
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              aria-pressed={gender === "laki"}
              onClick={() => setGender(gender === "laki" ? null : "laki")}
              className={gp(gender === "laki")}
              aria-label="Laki-Laki"
            >
              <Image
                src="/brand/buttons/laki.png"
                alt="Laki-Laki"
                loading="eager"
                width={358}
                height={104}
                className="h-auto w-full"
              />
            </button>
            <button
              type="button"
              aria-pressed={gender === "perempuan"}
              onClick={() => setGender(gender === "perempuan" ? null : "perempuan")}
              className={gp(gender === "perempuan")}
              aria-label="Perempuan"
            >
              <Image
                src="/brand/buttons/perempuan.png"
                alt="Perempuan"
                loading="eager"
                width={358}
                height={104}
                className="h-auto w-full"
              />
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
            className="brick-range"
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
        aria-label="Cari sekarang"
        // Bottom-right of the panel: it is the terminal action, so it sits
        // where the eye lands after reading the two choices above.
        className="mt-6 ml-auto block cursor-pointer chip-spring transition-transform hover:scale-105 active:scale-95"
      >
        <Image
          src="/brand/buttons/proceed.png"
          alt="Cari sekarang"
          loading="eager"
          width={267}
          height={134}
          className="h-auto w-[84px] sm:w-[96px]"
        />
      </button>
    </section>
  );
}
