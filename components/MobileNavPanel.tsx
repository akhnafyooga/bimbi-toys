"use client";

import { useState } from "react";

// Mobile-only: the second header row (account / orders / wishlist / cart).
// Collapsible so the page can be read without the nav taking up space.
// Children are rendered on the server and passed through, so the sign-out
// server action inside keeps working.
export default function MobileNavPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="md:hidden">
      {open && <div className="px-2 pb-2">{children}</div>}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Sembunyikan menu" : "Tampilkan menu"}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-bimbi-pink transition-colors"
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
