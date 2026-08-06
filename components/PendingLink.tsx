"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// A <Link> that shows a spinner while the next route is being fetched.
//
// useLinkStatus() was the obvious choice and does NOT work here: it only
// reports `pending` while a navigation is *blocked*, and these targets are
// same-route query changes that Next resolves without blocking — polled at 8ms,
// `pending` never once flipped true. Driving the navigation through a
// transition captures the RSC round-trip instead, which is the wait a shopper
// actually sees.
export default function PendingLink({
  href,
  children,
  className = "",
  label,
  overlayLabel = "Membuka…",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  label: string;
  overlayLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-label={label}
      aria-busy={pending}
      className={className}
      onClick={(e) => {
        // Leave modified clicks alone so "open in new tab" still works, and
        // keep the real href so the link stays crawlable and right-clickable.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        startTransition(() => router.push(href));
      }}
    >
      {children}

      {pending && (
        <span
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-[1px]"
        >
          <span className="flex items-center gap-1.5">
            {[
              "var(--color-wm-red)",
              "var(--color-bimbi-sky)",
              "var(--color-bimbi-mint)",
              "var(--color-wm-yellow)",
            ].map((c, i) => (
              <span
                key={c}
                className="loader-dot block h-2.5 w-2.5"
                style={{ backgroundColor: c, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          <span className="text-xs font-bold text-bimbi-ink">{overlayLabel}</span>
        </span>
      )}
    </Link>
  );
}
