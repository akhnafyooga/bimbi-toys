"use client";

import { useEffect, useRef, useState } from "react";

// Logo slot for the user's upcoming artwork.
// Drop files at public/brand/logo-mark.png (square icon) and
// public/brand/logo-full.png (wordmark) — until they exist, a dashed
// "LOGO" placeholder shows exactly where the artwork will land.
export default function BrandLogo({
  variant,
  height = 40,
  heightClass,
  className = "",
}: {
  variant: "mark" | "full";
  height?: number;
  // Optional Tailwind height class(es) for responsive sizing (e.g. "h-9 sm:h-11").
  // When set it drives the rendered height instead of the fixed `height` px.
  heightClass?: string;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const src = variant === "mark" ? "/brand/logo-mark.png" : "/brand/logo-full.png";

  // The 404 error event can fire before React hydrates and attaches onError —
  // so also check the image's state right after mount.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);

  if (missing) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md border-2 border-dashed border-current opacity-60 px-2 text-[10px] font-extrabold uppercase tracking-widest select-none ${heightClass ?? ""} ${className}`}
        style={{ height: heightClass ? undefined : height, minWidth: variant === "mark" ? height : height * 3 }}
        title="Tempatkan file logo di public/brand/"
      >
        LOGO
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local asset; plain img keeps the broken-state check simple
    <img
      ref={ref}
      src={src}
      alt="Bimbi Toys"
      width={variant === "mark" ? height : height * 3}
      height={height}
      className={`w-auto object-contain ${className}`}
      style={{ height }}
      onError={() => setMissing(true)}
    />
  );
}
