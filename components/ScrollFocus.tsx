"use client";

import { useEffect, useRef, useState } from "react";

// Scales its child by how close it is to the middle of the viewport: the tile
// you have scrolled to grows, the other shrinks back. Only meaningful where the
// tiles are stacked vertically, so it is mobile-only — side by side on desktop
// both tiles are equally central and everything would just sit at full size.
const MIN_SCALE = 0.86;
const MAX_SCALE = 1;

export default function ScrollFocus({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MAX_SCALE);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(max-width: 639px)");

    let queued = false;
    const sync = () => {
      queued = false;
      if (!mq.matches) {
        setScale(MAX_SCALE);
        return;
      }
      const r = el.getBoundingClientRect();
      const tileCentre = r.top + r.height / 2;
      const viewCentre = window.innerHeight / 2;
      // Normalised distance: 0 when dead-centre, 1 once it is a full half-screen
      // away. Clamped so tiles far off-screen stop shrinking further.
      const d = Math.min(1, Math.abs(tileCentre - viewCentre) / (window.innerHeight / 2));
      setScale(MAX_SCALE - (MAX_SCALE - MIN_SCALE) * d);
    };

    // Coalesce to one measurement per frame: scroll fires far more often than
    // the layout can meaningfully change.
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-scroll-focus
      style={{ transform: `scale(${scale})` }}
      className="origin-center transition-transform duration-200 ease-out will-change-transform"
    >
      {children}
    </div>
  );
}
