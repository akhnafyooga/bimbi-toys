"use client";

import { useEffect, useRef, useState } from "react";

// Pops whenever the cart count changes (a router.refresh() after adding to
// cart re-renders the navbar with the new count).
export default function CartBadge({ count, variant }: { count: number; variant: "inline" | "bubble" }) {
  const prev = useRef(count);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    if (prev.current !== count) {
      prev.current = count;
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 450);
      return () => clearTimeout(t);
    }
  }, [count]);

  if (variant === "bubble") {
    return (
      <span
        className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-bimbi-pink text-white text-[10px] font-bold flex items-center justify-center ${
          popping ? "animate-badge-pop" : ""
        }`}
      >
        {count}
      </span>
    );
  }

  return <span className={`inline-block ${popping ? "animate-badge-pop" : ""}`}>({count})</span>;
}
