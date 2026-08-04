"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { HEADER_SCROLL_EVENT } from "@/components/HeaderScrollState";

// The second header row (account / orders / wishlist / cart), on every screen size.
// Collapsible so the page can be read without the nav taking up space.
// Children are rendered on the server and passed through, so the sign-out
// server action inside keeps working.
export default function NavPanel({ children }: { children: React.ReactNode }) {
  // Scroll state is READ from HeaderScrollState, never recomputed here.
  // Deliberately not a second scroll listener: two listeners racing on the same
  // threshold is what made the header flicker.
  const scrolled = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(HEADER_SCROLL_EVENT, onChange);
      return () => window.removeEventListener(HEADER_SCROLL_EVENT, onChange);
    },
    () =>
      document.querySelector<HTMLElement>("header[data-sticky-header]")?.dataset.scrolled === "true",
    () => false
  );

  // An explicit tap wins until the next scroll flip, so the toggle still works
  // while scrolled. Derived rather than synced — assigning state from an effect
  // is what react-hooks/set-state-in-effect (rightly) rejects.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !scrolled;

  useEffect(() => {
    // Clearing inside a listener (not the effect body) keeps the rule happy.
    const clear = () => setManual(null);
    window.addEventListener(HEADER_SCROLL_EVENT, clear);
    return () => window.removeEventListener(HEADER_SCROLL_EVENT, clear);
  }, []);

  return (
    <div>
      {open && <div className="px-2 pb-2">{children}</div>}

      <button
        type="button"
        onClick={() => setManual(!open)}
        aria-expanded={open}
        aria-label={open ? "Sembunyikan menu" : "Tampilkan menu"}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-slate-700 hover:text-bimbi-pink transition-colors"
      >
        {open ? "Sembunyikan menu" : "Menu"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "" : "rotate-180"}`}
          aria-hidden="true"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}
