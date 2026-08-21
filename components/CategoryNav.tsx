"use client";

import { useRef } from "react";
import PendingLink from "@/components/PendingLink";

type Category = { id: string; slug: string; name: string };

// The category strip: one sliding row on every screen size, Walmart-style
// dark links on white. Desktop gets ‹ › arrow buttons; on touch you swipe.
export default function CategoryNav({ categories }: { categories: Category[] }) {
  const rowRef = useRef<HTMLElement>(null);

  function slide(direction: -1 | 1) {
    rowRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center min-w-0 flex-1">
      <button
        aria-label="Geser kategori ke kiri"
        onClick={() => slide(-1)}
        className="hidden sm:flex shrink-0 items-center justify-center w-8 self-stretch font-bold text-slate-400 hover:text-bimbi-pink transition-colors btn-press"
      >
        ‹
      </button>

      <nav
        ref={rowRef}
        className="flex flex-1 min-w-0 items-center overflow-x-auto scrollbar-none whitespace-nowrap"
      >
        <PendingLink
          href="/"
          label="Home"
          overlayLabel={null}
          className="relative shrink-0 px-4 py-3 font-bold text-sm text-slate-800 hover:text-bimbi-pink border-b-2 border-transparent hover:border-bimbi-pink transition-colors chip-spring"
        >
          Home
        </PendingLink>
        {categories.map((c) => (
          <PendingLink
            key={c.id}
            href={`/?category=${c.slug}`}
            label={c.name}
            overlayLabel={null}
            className="relative shrink-0 px-4 py-3 font-semibold text-sm text-slate-600 hover:text-bimbi-pink border-b-2 border-transparent hover:border-bimbi-pink transition-colors chip-spring"
          >
            {c.name}
          </PendingLink>
        ))}
      </nav>

      {/* edge fade hints that the row keeps going */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-0 bottom-0 w-8 bg-gradient-to-l from-bimbi-cream to-transparent hidden sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-bimbi-cream to-transparent sm:hidden"
      />

      <button
        aria-label="Geser kategori ke kanan"
        onClick={() => slide(1)}
        className="hidden sm:flex shrink-0 items-center justify-center w-8 self-stretch font-bold text-slate-400 hover:text-bimbi-pink transition-colors btn-press"
      >
        ›
      </button>
    </div>
  );
}
