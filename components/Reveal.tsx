"use client";

import { useEffect, useRef } from "react";

// Wraps a section so it gently rises into view on first scroll-in.
// Pure CSS transition (.reveal/.revealed in globals.css); this component
// only flips the class via one IntersectionObserver.
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fail-safe: content must never stay hidden. A working observer always
    // fires its initial callback right away (clearing this timer); if it
    // doesn't fire at all, reveal without the effect.
    const fallback = setTimeout(() => el.classList.add("revealed"), 2000);
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(fallback);
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
