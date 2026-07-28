"use client";

import { useEffect, useRef, useState } from "react";

// Brand icon slots. Drop the artwork at public/brand/icons/<name>.png —
// until a file exists, the original emoji shows as fallback.
const FALLBACK: Record<string, string> = {
  cart: "",
  location: "",
  search: "",
  wishlist: "",
  // Placeholder emoji until the artwork lands at
  // public/brand/icons/akun.png and public/brand/icons/pesanan.png
  akun: "👤",
  pesanan: "🧾",
};

export default function AppIcon({
  name,
  size = 20,
  className = "",
}: {
  name: "cart" | "location" | "search" | "wishlist" | "akun" | "pesanan";
  size?: number;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The 404 error event can fire before React hydrates and attaches onError —
  // so also check the image's state right after mount.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);

  if (missing) {
    return (
      <span className={`inline-block leading-none ${className}`} style={{ fontSize: size * 0.9 }}>
        {FALLBACK[name]}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local asset; plain img keeps the broken-state check simple
    <img
      ref={ref}
      src={`/brand/icons/${name}.png`}
      alt={FALLBACK[name]}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  );
}
