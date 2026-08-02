"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bimbi-tour-done-v1";

type Step = {
  selector: string;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    selector: "#tour-search",
    title: "1. Cari mainanmu ",
    text: "Cari barang keinginanmu di sini! Ketik namanya, atau pilih kategorinya dulu biar hasilnya lebih pas.",
  },
  {
    selector: '[data-tour="products"] > *:first-child',
    title: "2. Lihat & pilih barang ",
    text: "Klik barang untuk melihat informasi lebih lanjut dan memasukkannya ke keranjang.",
  },
  {
    // Mobile and desktop each render their own cart control, so match on the
    // shared attribute and let findVisible() pick whichever one is on screen.
    selector: '[data-tour="cart"]',
    title: "3. Selesaikan belanjamu ",
    text: "Kalau semua sudah masuk keranjang, klik keranjang di sini untuk menyelesaikan pembelianmu.",
  },
];

// A responsive layout keeps both variants in the DOM and hides one with CSS.
// querySelector would happily return the hidden one, whose bounding box is all
// zeroes — putting the spotlight in the top-left corner. Pick a rendered one.
// Height matters as much as width now: the sticky header collapses rows with
// grid-template-rows: 0fr, which zeroes an element's HEIGHT while leaving its
// width intact — a width-only check would happily spotlight an invisible strip.
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

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // First visit only — show after a short beat so the page settles first.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
    setStep(0);
  }, []);

  const restart = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  // Track the highlighted element every frame while the tour is open, so the
  // spotlight follows it through smooth-scrolling and window resizes.
  useEffect(() => {
    if (!active) return;

    const el = findVisible(STEPS[step].selector);
    if (!el) {
      // Target missing (e.g. empty catalog) — skip ahead, or end the tour.
      // Deferred so we don't call setState synchronously inside the effect.
      const t = setTimeout(() => {
        if (step < STEPS.length - 1) setStep((s) => s + 1);
        else finish();
      }, 0);
      return () => clearTimeout(t);
    }

    // Targets inside the sticky header must not be centred: scrolling down to
    // "centre" them makes the header collapse and shrink the very element being
    // pointed at. Go to the top instead, where the header is fully expanded.
    if (el.closest("header[data-sticky-header]")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      el.scrollIntoView({ block: "center" });
    }

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Measure now, then re-measure on scroll/resize and via a short interval
    // (covers smooth-scroll settling without pinning the page to a rAF loop).
    measure();
    const interval = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, finish]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={restart}
        title="Lihat panduan belanja"
        aria-label="Lihat panduan belanja"
        className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-bimbi-sky text-white text-lg font-bold shadow-lg hover:bg-blue-800 hover:scale-110 transition-all cursor-pointer"
      >
        ?
      </button>
    );
  }

  if (!rect) return null;

  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tooltipWidth = Math.min(320, vw - 32);
  const spaceBelow = vh - (rect.top + rect.height);
  const showBelow = spaceBelow > 190;
  const tooltipTop = showBelow ? rect.top + rect.height + pad + 10 : undefined;
  const tooltipBottom = showBelow ? undefined : vh - rect.top + pad + 10;
  const tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16));

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Panduan belanja">
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

      {/* tooltip */}
      <div
        className="absolute rounded-2xl bg-white shadow-2xl p-5 animate-pop-in"
        style={{ top: tooltipTop, bottom: tooltipBottom, left: tooltipLeft, width: tooltipWidth }}
      >
        <p className="font-display font-bold text-bimbi-grape">{current.title}</p>
        <p className="text-sm text-bimbi-ink/70 mt-1.5 leading-relaxed">{current.text}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Lewati
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">
              {step + 1}/{STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="rounded-full bg-bimbi-pink hover:bg-bimbi-pink-dark text-white text-sm font-bold px-5 py-2 transition-colors cursor-pointer"
            >
              {isLast ? "Selesai " : "Lanjut →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
