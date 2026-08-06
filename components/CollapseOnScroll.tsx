"use client";

import { useEffect, useState } from "react";

// Mobile-only minimise/maximise driven by scroll position: the section is open
// at the top of the page and folds away once you scroll past it, so the tiles
// stop eating vertical space on a phone. Tapping the header toggles manually.
//
// Same two-threshold + settle-lock shape as HeaderScrollState, and for the same
// reason: collapsing removes layout, which moves scrollY and would otherwise
// re-cross a single threshold and flicker forever.
const HIDE_BELOW = 260;
const SHOW_ABOVE = 80;
const SETTLE_MS = 380;

export default function CollapseOnScroll({
  id,
  title,
  headingClass = "text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink",
  children,
}: {
  id: string;
  title: string;
  headingClass?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  // State, not a ref: reading a ref during render is disallowed, and this value
  // decides what renders.
  const [manual, setManual] = useState<boolean | null>(null);

  useEffect(() => {
    // Desktop keeps the section permanently open — there is room for it there,
    // and matchMedia means no scroll listener runs at all on wide screens.
    const mq = window.matchMedia("(max-width: 639px)");
    let scrolled = false;
    let lockedUntil = 0;

    const sync = () => {
      if (!mq.matches) {
        setOpen(true);
        return;
      }
      const now = performance.now();
      if (now < lockedUntil) return;
      const y = window.scrollY;
      const next = scrolled ? y > SHOW_ABOVE : y > HIDE_BELOW;
      if (next === scrolled) return;
      scrolled = next;
      lockedUntil = now + SETTLE_MS;
      setManual(null); // a scroll flip clears any manual override
      setOpen(!next);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const shown = manual ?? open;

  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className={`flex-1 ${headingClass}`}>
          {title}
        </h2>

        {/* Toggle is mobile-only, matching where the collapsing happens. */}
        <button
          type="button"
          onClick={() => setManual(!shown)}
          aria-expanded={shown}
          aria-controls={`${id}-panel`}
          className="sm:hidden shrink-0 cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-600"
        >
          {shown ? "Sembunyikan" : "Tampilkan"}
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className={`ml-1 inline-block transition-transform ${shown ? "" : "rotate-180"}`}
          >
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      </div>

      {/* grid-rows 1fr -> 0fr keeps the natural height instead of a magic px
          value, and animates cleanly. */}
      <div
        id={`${id}-panel`}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: shown ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
