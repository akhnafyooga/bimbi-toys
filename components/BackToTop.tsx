"use client";

import { useEffect, useState } from "react";

// Floating "back to top" button — mirrors the "?" help button (bottom-right)
// but sits bottom-left. Appears only after the user scrolls down a bit.
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="glass-chip fixed bottom-5 left-5 z-40 h-11 w-11 rounded-full text-xl font-bold text-bimbi-pink-dark shadow-lg hover:text-bimbi-pink hover:scale-110 transition-all cursor-pointer flex items-center justify-center"
    >
      ↑
    </button>
  );
}
