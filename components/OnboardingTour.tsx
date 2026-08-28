"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "bimbi-tour-done-v2";

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
  {
    // Targets the section element that matches the heading label
    selector: 'section[aria-labelledby="yang-kamu-cari"]',
    title: "4. Yang Kamu Cari ",
    text: "Cari yang kamu mau sesuai tipe di sini.",
  },
  {
    selector: 'section[aria-labelledby="buat-kamu-yang-gasempet"]',
    title: "5. Intip Toko ",
    text: "Penasaran sama barang di toko? Lihat di sini.",
  },
  {
    selector: 'section[aria-labelledby="cari-mainanmu"]',
    title: "6. Cari Mainanmu ",
    text: "Atur budget dan gender anak untuk mencari mainan mu.",
  },

];

// A responsive layout keeps both variants in the DOM and hides one with CSS
// (e.g. the mobile/desktop cart shortcuts). querySelector would happily
// return the hidden one, whose bounding box is all zeroes — putting the
// spotlight in the top-left corner. Pick a rendered one: both dimensions
// must be non-zero, not just width.
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
  // Bumped to re-run the step effect after a target remounts.
  const [retry, setRetry] = useState(0);
  // Portals need the DOM, so nothing renders until after hydration. This is the
  // documented client-detection pattern — setting state in an effect would trip
  // react-hooks/set-state-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

    // Check if element is directly available in DOM tree
    let el = findVisible(STEPS[step].selector);
    
    if (!el) {
      // FIX: Instead of forcing scrollTo({ top: 0 }) which breaks steps 4-6,
      // we check if an unrendered hidden matching variant can guide our viewport.
      const hiddenEl = document.querySelector(STEPS[step].selector);
      if (hiddenEl) {
        hiddenEl.scrollIntoView({ block: "center", behavior: "auto" });
      }

      const t = setTimeout(() => {
        el = findVisible(STEPS[step].selector);
        if (el) {
          setRetry((r) => r + 1); // Found! Re-trigger positioning layout
        } else if (step < STEPS.length - 1) {
          setStep((s) => s + 1); // Not on screen (e.g. absent feature), skip safely
        } else {
          finish();
        }
      }, 300);
      return () => clearTimeout(t);
    }

    // Safely center viewport on our active tour layout section
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    const measure = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Keep layout measurements highly precise during transitions
    measure();
    const interval = setInterval(measure, 100);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, retry, finish]);

  if (!mounted) return null;

  if (!active) {
    return createPortal(
      <button
        type="button"
        onClick={restart}
        title="Lihat panduan belanja"
        aria-label="Lihat panduan belanja"
        className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-bimbi-sky text-white text-lg font-bold shadow-lg hover:bg-blue-800 hover:scale-110 transition-all cursor-pointer"
      >
        ?
      </button>,
      document.body
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

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Panduan belanja">
      {/* spotlight overlay frame */}
      <div
        className="absolute rounded-xl transition-all duration-300"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
        }}
      />

      {/* tooltip utility card */}
      <div
        className="absolute rounded-2xl bg-white shadow-2xl p-5 animate-pop-in transition-all duration-300"
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
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Kembali
              </button>
            )}
            <span className="text-xs text-slate-400 font-semibold">
              {step + 1}/{STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="rounded-lg bg-bimbi-sky px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-all cursor-pointer"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
