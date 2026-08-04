"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Single source of truth for "has the page scrolled". Marks the header so CSS
// can fold the logo away, and broadcasts the same decision so NavPanel can
// close its tiles without running a competing scroll listener.
export const HEADER_SCROLL_EVENT = "bimbi:header-scrolled";

// Two thresholds, not one. Collapsing the header removes ~84px of layout, which
// shifts the page up and pushes scrollY back down — with a single threshold that
// lands you on the other side of it, so the header expands, grows, scrolls back,
// and flickers forever. The gap between these is wider than the height change,
// which is what breaks the loop.
const HIDE_BELOW = 220;
const SHOW_ABOVE = 40;

// Folding the header removes ~130px of layout in a 0.28s animation. While that
// runs, scrollY keeps moving on its own, which can re-cross a threshold and
// flip the header straight back. Ignoring changes until the fold has finished
// is what actually stops the flicker — hysteresis alone is not enough.
const SETTLE_MS = 420;

export default function HeaderScrollState() {
  const pathname = usePathname();
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header[data-sticky-header]");
    if (!header) return;

    if (pathname !== "/") {
      header.dataset.scrolled = "true";
      window.dispatchEvent(
        new CustomEvent(HEADER_SCROLL_EVENT, { detail: true })
      );
      return;
    }

    let scrolled = false;
    let lockedUntil = 0;

    const sync = () => {
      const now = performance.now();
      if (now < lockedUntil) return; // mid-fold: the layout is still moving
      const y = window.scrollY;
      // Once collapsed it stays collapsed until well back up, and vice versa.
      const next = scrolled ? y > SHOW_ABOVE : y > HIDE_BELOW;
      if (next === scrolled) return;
      scrolled = next;
      lockedUntil = now + SETTLE_MS;
      header.dataset.scrolled = String(next);
      window.dispatchEvent(new CustomEvent(HEADER_SCROLL_EVENT, { detail: next }));
    };

    header.dataset.scrolled = "false";
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [pathname]);

  return null;
}

