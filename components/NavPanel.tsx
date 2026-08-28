"use client";

import { useEffect, useRef, useState } from "react";

// The account/orders/wishlist/cart tiles, collapsed into a dropdown that
// opens from the Menu chip in the slim header row. One SOLID white panel —
// same treatment as the search suggest dropdown (menus people read stay
// opaque; glass stays on chrome). Children are rendered on the server and
// passed through, so the sign-out server action inside keeps working.
//
// Closes on: outside tap, Escape, or any click inside (tiles navigate away —
// leaving the dropdown open over the next page would just be noise).
export default function NavPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu akun dan pesanan"
        className={`glass-chip flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-bimbi-ink transition-colors chip-spring hover:border-bimbi-pink/50 ${
          open ? "border-bimbi-pink/50" : ""
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl"
          onClickCapture={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
