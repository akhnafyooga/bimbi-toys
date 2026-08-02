"use client";

import { useEffect } from "react";

// Marks the header once the page has scrolled, so CSS can collapse the logo
// and the button tiles and leave the search bar pinned to the top.
// Renders nothing — it only flips a data attribute on the <header>.
export default function HeaderScrollState() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header[data-sticky-header]");
    if (!header) return;

    // Past the logo + tiles, so the collapse happens once they have scrolled by
    // rather than the instant the page moves.
    const THRESHOLD = 90;
    let last: boolean | null = null;

    const sync = () => {
      const scrolled = window.scrollY > THRESHOLD;
      if (scrolled === last) return; // avoid touching the DOM on every event
      last = scrolled;
      header.dataset.scrolled = String(scrolled);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return null;
}
