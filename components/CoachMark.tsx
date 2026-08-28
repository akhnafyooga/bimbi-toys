"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// A one-shot spotlight hint for a single control — the onboarding tour's
// mechanics in miniature. Shows once per browser (localStorage), points at
// one element, explains it, goes away. Used to teach the "Tandai" button on
// the shelf detail page.

function findVisible(selector: string): Element | null {
  const all = Array.from(document.querySelectorAll(selector));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

type Rect = { top: number; left: number; width: number; height: number };

export default function CoachMark({
  selector,
  storageKey,
  title,
  text,
}: {
  selector: string;
  storageKey: string;
  title: string;
  text: string;
}) {
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  // Bumped when the target mounts late — re-runs the tracking effect.
  const [retry, setRetry] = useState(0);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // First encounter only — after a short beat so the page settles.
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      // Storage refused (private mode): skip the nag rather than loop it.
      return;
    }
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // best effort — hiding now matters more than remembering
    }
    setActive(false);
  };

  // Track the target while open, so the spotlight follows layout shifts.
  // No target (element unmounted/hidden)? One deferred re-check — it may be
  // a slow layout — then dismiss silently: a hint that can't point at
  // anything is just noise.
  useEffect(() => {
    if (!active) return;
    const el = findVisible(selector);
    if (!el) {
      const t = setTimeout(() => {
        if (findVisible(selector)) setRetry((r) => r + 1); // late mount — re-run
        else setActive(false);
      }, 450);
      return () => clearTimeout(t);
    }

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    const interval = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, selector, retry]);

  if (!mounted || !active || !rect) return null;

  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipWidth = Math.min(320, vw - 32);
  const spaceBelow = vh - (rect.top + rect.height);
  const showBelow = spaceBelow > 150;
  const tooltipTop = showBelow ? rect.top + rect.height + pad + 10 : undefined;
  const tooltipBottom = showBelow ? undefined : vh - rect.top + pad + 10;
  const tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16));

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label={title} onClick={dismiss}>
      {/* spotlight: the box-shadow darkens everything around the target */}
      <div
        className="absolute rounded-xl"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
        }}
      />
      {/* tooltip — stopPropagation so the Mengerti button is the explicit way
          out; tapping the dark backdrop also dismisses (onClick above) */}
      <div
        className="absolute rounded-2xl bg-white shadow-2xl p-5 animate-pop-in"
        style={{ top: tooltipTop, bottom: tooltipBottom, left: tooltipLeft, width: tooltipWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display font-bold text-bimbi-grape">{title}</p>
        <p className="text-sm text-bimbi-ink/70 mt-1.5 leading-relaxed">{text}</p>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark text-white text-sm font-bold px-5 py-2 transition-colors cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
