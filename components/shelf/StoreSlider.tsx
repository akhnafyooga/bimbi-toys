"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_ADVANCE_MS = 6000;

// Full-width, one-slide-per-view slider for the homepage store showcase.
// Children are server-rendered slides (`w-full shrink-0 snap-start`); this
// component only owns the scroll viewport, arrows, dots, and the 6s
// auto-advance (looping, paused on hover/hold, reset by any manual move).
export default function StoreSlider({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    const i = Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth));
    indexRef.current = i;
    setIndex(i);
  }, [count]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  const goTo = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el || !el.clientWidth) return;
      const n = ((i % count) + count) % count;
      el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    },
    [count]
  );

  // Auto-advance; `index` in the deps means any manual move (swipe, arrow,
  // dot) restarts the 6s timer too.
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => goTo(indexRef.current + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, count, goTo, index]);

  if (count <= 0) return null;

  const arrow =
    "hidden sm:flex absolute top-1/2 -translate-y-1/2 z-20 h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-white text-bimbi-ink text-xl leading-none shadow-lg ring-1 ring-slate-200 hover:bg-bimbi-ink hover:text-white transition-colors cursor-pointer";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="relative">
        <div
          ref={ref}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none rounded-2xl border border-slate-200 shadow-card"
        >
          {children}
        </div>

        <button
          type="button"
          aria-label="Slide sebelumnya"
          onClick={() => goTo(index - 1)}
          className={`${arrow} left-2`}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Slide berikutnya"
          onClick={() => goTo(index + 1)}
          className={`${arrow} right-2`}
        >
          ›
        </button>
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ke toko ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === index ? "w-6 bg-bimbi-sky" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
