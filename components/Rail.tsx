"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Move by ~85% of a screenful so the next card peeks in and the user keeps
// their place, rather than a full page jump. Shared by the arrows and the dots
// so both agree on what "one slide" means.
const SLIDE_FRACTION = 0.85;

// Horizontal product rail with slide arrows and an optional page indicator.
// Children are server-rendered and passed through, so the cards stay server
// components. Touch devices already flick-scroll; the arrows are an addition.
export default function Rail({
  children,
  showDots = false,
  maxTrack,
}: {
  children: React.ReactNode;
  showDots?: boolean;
  /** Tailwind max-width class for the scroll track, e.g. "lg:max-w-[1040px]".
   *  Centres the row without justify-center, which would make the leading
   *  cards unreachable once the content overflows. */
  maxTrack?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    // 2px slack: sub-pixel widths mean scrollLeft rarely hits the exact max.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);

    // Pages, not items: the indicator tracks how far along the rail you are,
    // which is what a partially-visible card count makes ambiguous otherwise.
    const step = el.clientWidth * SLIDE_FRACTION;
    const total = Math.max(1, Math.ceil((el.scrollWidth - el.clientWidth) / step) + 1);
    setPages(total);
    setPage(Math.min(total - 1, Math.round(el.scrollLeft / step)));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Cards load images at different times, so the scrollable width changes
    // after mount — without this the right arrow can start out wrongly hidden.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  const slide = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * SLIDE_FRACTION, behavior: "smooth" });
  };

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth * SLIDE_FRACTION, behavior: "smooth" });
  };

  const arrow =
    "hidden sm:flex absolute top-[38%] -translate-y-1/2 z-20 h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-white text-bimbi-ink text-xl leading-none shadow-lg ring-1 ring-slate-200 hover:bg-bimbi-ink hover:text-white transition-colors disabled:opacity-0 disabled:pointer-events-none";

  return (
    <div className={`relative mx-auto ${maxTrack ?? ""}`}>
      <button
        type="button"
        aria-label="Geser ke kiri"
        onClick={() => slide(-1)}
        disabled={atStart}
        className={`${arrow} rail-arrow-left left-0 lg:-left-2`}
      >
        ‹
      </button>

      <div
        ref={ref}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 sm:mx-0 sm:px-0 scroll-smooth"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Geser ke kanan"
        onClick={() => slide(1)}
        disabled={atEnd}
        className={`${arrow} rail-arrow-right right-0 lg:-right-2`}
      >
        ›
      </button>

      {showDots && pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ke slide ${i + 1}`}
              aria-current={i === page}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-6 bg-bimbi-sky" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
