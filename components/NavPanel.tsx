"use client";

import { useEffect, useState } from "react";

// The second header row (account / orders / wishlist / cart), on every screen size.
// Collapsible so the page can be read without the nav taking up space.
// Children are rendered on the server and passed through, so the sign-out
// server action inside keeps working.
export default function NavPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  // Fold the tiles away as soon as the page scrolls, and bring them back at the
  // top. Driving the component's own state (rather than hiding it with CSS)
  // keeps the toggle button's label and aria-expanded honest.
  useEffect(() => {
    const THRESHOLD = 90;
    let last: boolean | null = null;

    const sync = () => {
      const shouldOpen = window.scrollY <= THRESHOLD;
      if (shouldOpen === last) return; // only act when crossing the threshold,
      last = shouldOpen; //                 so a manual toggle isn't fought on
      setOpen(shouldOpen); //               every scroll event
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div>
      {open && <div className="px-2 pb-2">{children}</div>}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
