"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isContactReady, waLink } from "@/lib/storeContacts";

// Interactive stage for a shelf photo on the shelf detail page.
//
// Inline mode: pan (drag) + zoom (wheel/pinch/double-tap/pills) so shoppers
// can look at the rack up close. Pressing "Mau yang mana? Lingkari" blows the
// photo up to a fullscreen, darkened + blurred overlay separated from the
// page — one drag there draws a circle around the product the shopper is
// curious about, then the mode auto-exits and the WhatsApp CTA
// "Penasaran sama produk ini?" appears. Tapping it crops the circled area to
// a JPEG, uploads it, and opens a wa.me chat with the store (wa.me can only
// prefill text, so the message carries the crop's URL).
//
// Everything is hand-rolled with pointer events — no viewer dependency.

type Circle = { cx: number; cy: number; r: number }; // natural image pixels

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export default function ShelfPhotoViewer({
  shelfId,
  image,
  code,
  name,
  storeName,
  whatsapp,
}: {
  shelfId: string;
  image: string;
  code: string;
  name: string;
  storeName: string;
  whatsapp: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  // Photo geometry — set on load, drives the inline stage's aspect ratio.
  const [aspect, setAspect] = useState<number | null>(null);
  const [dims, setDims] = useState<{ iw: number; ih: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // Pan/zoom transform of the photo layer.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Circling mode + the drawn circle (committed) / in-progress draft.
  const [circling, setCircling] = useState(false);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [draft, setDraft] = useState<Circle | null>(null);

  // Cross-pointer-event interaction state (refs, not state).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchPrev = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ px: number; py: number; tx: number; ty: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isContactReady(whatsapp);

  // ---- Display geometry ----------------------------------------------------
  // The image is object-contain inside the stage, so in fullscreen (stage
  // aspect ≠ photo aspect) it letterboxes. All pointer↔image math goes
  // through the displayed-image rect: fit scale, then the transform, then
  // the centered offsets.

  // px per image px at scale 1 (how much room the photo takes in the stage)
  const fit = dims && stage.w > 0 && stage.h > 0 ? Math.min(stage.w / dims.iw, stage.h / dims.ih) : 0;
  // px per image px at the current zoom (uniform in x and y)
  const f = fit * scale;
  // displayed image size + top-left corner within the stage
  const disp = dims ? { w: dims.iw * f, h: dims.ih * f } : { w: 0, h: 0 };
  const ox = dims ? (stage.w - disp.w) / 2 + tx : 0;
  const oy = dims ? (stage.h - disp.h) / 2 + ty : 0;

  const clampPan = (nx: number, ny: number, ns: number): [number, number] => {
    if (!dims) return [0, 0];
    const mx = Math.max(0, (dims.iw * fit * ns - stage.w) / 2);
    const my = Math.max(0, (dims.ih * fit * ns - stage.h) / 2);
    return [Math.min(mx, Math.max(-mx, nx)), Math.min(my, Math.max(-my, ny))];
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    if (!dims) return;
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const k = ns / scale;
    // keep the point under the cursor still: scale the offsets around it
    const nx = px - (px - ox) * k - (stage.w - dims.iw * fit * ns) / 2;
    const ny = py - (py - oy) * k - (stage.h - dims.ih * fit * ns) / 2;
    const [cx2, cy2] = clampPan(nx, ny, ns);
    setScale(ns);
    setTx(cx2);
    setTy(cy2);
  };

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const zoomed = scale > 1.01;
  const toggleZoom = () => {
    if (zoomed) resetView();
    else zoomAt(stage.w / 2, stage.h / 2, DOUBLE_TAP_SCALE);
  };

  const toImage = (x: number, y: number) => {
    if (!f) return null;
    return { x: (x - ox) / f, y: (y - oy) / f };
  };

  const startCircling = () => {
    setCircling(true);
    setDraft(null);
    resetView(); // a clean 1x canvas is the easiest to draw on
  };

  const stopCircling = () => {
    setCircling(false);
    setDraft(null);
  };

  // Esc exits circling; lock page scroll while the fullscreen stage is up.
  useEffect(() => {
    if (!circling) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopCircling();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [circling]);

  // Wheel must be a native listener so preventDefault isn't ignored (React's
  // synthetic wheel handler is passive). Re-attached each render on purpose —
  // zoomAt closes over the latest transform state.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const localPos = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function handlePointerDown(e: React.PointerEvent) {
    if (!dims) return; // photo not loaded yet — nothing to interact with
    try {
      stageRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    const p = localPos(e);
    pointers.current.set(e.pointerId, p);
    moved.current = false;

    if (pointers.current.size === 2) {
      // Two fingers always means pinch: cancel whatever single-finger mode
      // (draw or pan) was starting.
      drawStart.current = null;
      setDraft(null);
      panStart.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchPrev.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }

    if (circling) {
      drawStart.current = toImage(p.x, p.y);
    } else {
      panStart.current = { px: p.x, py: p.y, tx, ty };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = localPos(e);
    const prev = pointers.current.get(e.pointerId)!;
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > 2) moved.current = true;
    pointers.current.set(e.pointerId, p);

    // Pinch: zoom by finger distance + pan by midpoint travel.
    if (pointers.current.size >= 2 && pinchPrev.current && dims) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const pp = pinchPrev.current;
      if (dist > 0 && pp.dist > 0) {
        const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (dist / pp.dist)));
        const k = ns / scale;
        // current offsets, shifted by the midpoint travel…
        const sx = ox + (mx - pp.mx);
        const sy = oy + (my - pp.my);
        // …then scaled around the midpoint
        const nx = mx - (mx - sx) * k - (stage.w - dims.iw * fit * ns) / 2;
        const ny = my - (my - sy) * k - (stage.h - dims.ih * fit * ns) / 2;
        const [cx2, cy2] = clampPan(nx, ny, ns);
        setScale(ns);
        setTx(cx2);
        setTy(cy2);
      }
      pinchPrev.current = { dist, mx, my };
      return;
    }

    // Drawing: circle from the press point to the current point.
    if (circling && drawStart.current) {
      const cur = toImage(p.x, p.y);
      if (cur) {
        const s = drawStart.current;
        setDraft({
          cx: (s.x + cur.x) / 2,
          cy: (s.y + cur.y) / 2,
          r: Math.hypot(cur.x - s.x, cur.y - s.y) / 2,
        });
      }
      return;
    }

    // Panning.
    if (panStart.current) {
      const ps = panStart.current;
      const [nx, ny] = clampPan(ps.tx + (p.x - ps.px), ps.ty + (p.y - ps.py), scale);
      setTx(nx);
      setTy(ny);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const p = pointers.current.get(e.pointerId) ?? null;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchPrev.current = null;

    // Finish drawing: commit the circle if it's big enough to be intentional,
    // then auto-exit circling mode (one circle at a time, toggle to redo).
    if (circling && drawStart.current) {
      const minR = f ? 12 / f : 0; // ≥12 screen px
      if (draft && draft.r > minR) {
        setCircle(draft);
        setCircling(false);
      }
      setDraft(null);
      drawStart.current = null;
      return;
    }

    // Double-tap zoom (touch). Mouse uses onDoubleClick below.
    if (e.pointerType !== "mouse" && p && !moved.current) {
      const now = Date.now();
      const lt = lastTap.current;
      if (lt && now - lt.t < 300 && Math.hypot(p.x - lt.x, p.y - lt.y) < 32) {
        lastTap.current = null;
        if (scale > 1.01) resetView();
        else zoomAt(p.x, p.y, DOUBLE_TAP_SCALE);
      } else {
        lastTap.current = { t: now, x: p.x, y: p.y };
      }
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    const r = stageRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (scale > 1.01) resetView();
    else zoomAt(x, y, DOUBLE_TAP_SCALE);
  }

  // Crop the circled region to a JPEG (≤800px, circle outlined on top).
  async function makeCropFile(): Promise<File | null> {
    const img = imgElRef.current;
    const c = circle;
    if (!img || !c || !dims) return null;
    const { iw, ih } = dims;

    const pad = 1.35;
    const l = Math.max(0, c.cx - c.r * pad);
    const t = Math.max(0, c.cy - c.r * pad);
    const rEdge = Math.min(iw, c.cx + c.r * pad);
    const bEdge = Math.min(ih, c.cy + c.r * pad);
    const w = rEdge - l;
    const h = bEdge - t;
    if (w < 8 || h < 8) return null;

    const s = Math.min(1, 800 / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * s));
    const ch = Math.max(1, Math.round(h * s));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, l, t, w, h, 0, 0, cw, ch);
    ctx.beginPath();
    ctx.ellipse((c.cx - l) * s, (c.cy - t) * s, c.r * s, c.r * s, 0, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(3, cw * 0.012);
    ctx.strokeStyle = "#de1c24";
    ctx.stroke();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return null;
    return new File([blob], "rak.jpg", { type: "image/jpeg" });
  }

  async function handleAsk() {
    if (!ready || sending) return;
    setError(null);
    // Open the tab synchronously so popup blockers don't kill the WhatsApp
    // handoff; point it at the wa.me URL once the upload finishes.
    const popup = window.open("", "_blank");
    setSending(true);
    try {
      const file = await makeCropFile();
      if (!file) throw new Error("crop failed");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("shelfId", shelfId);
      const res = await fetch("/api/shelf-ask", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "upload failed");
      const cropUrl = new URL(data.url, window.location.origin).toString();
      const msg = `Halo, saya penasaran sama produk ini di toko, boleh tahu harga dan detail ga ya?\n\nRak ${code} — ${name} (${storeName})\nLihat bagian yang saya lingkari: ${cropUrl}`;
      const href = waLink(whatsapp, msg);
      if (popup) popup.location.href = href;
      else window.open(href, "_blank");
    } catch (err) {
      popup?.close();
      setError(err instanceof Error && err.message !== "crop failed" && err.message !== "upload failed"
        ? err.message
        : "Gagal menyiapkan foto. Coba lagi ya.");
    } finally {
      setSending(false);
    }
  }

  const shown = draft ?? circle;
  const ellipse = shown && f ? { cx: shown.cx * f + ox, cy: shown.cy * f + oy, r: shown.r * f } : null;

  return (
    // Inline: a card. Circling: a fullscreen, darkened + blurred overlay
    // floating in front of the page. Same DOM node either way — only classes
    // change, so the stage keeps its refs, observers, and loaded image.
    <div
      className={
        circling
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-bimbi-ink/60 p-3 sm:p-6 backdrop-blur-md"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
      }
    >
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`relative overflow-hidden select-none ${
          circling ? "h-full w-full rounded-xl bg-black" : "w-full bg-slate-100"
        } ${
          circling || scale > 1.01 ? "touch-none" : "touch-pan-y"
        } ${circling ? "cursor-crosshair" : "cursor-grab"}`}
        style={circling ? undefined : aspect ? { aspectRatio: String(aspect) } : { aspectRatio: "4 / 3" }}
      >
        {/* Photo layer — transformed for pan/zoom */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
        >
          <Image
            src={image}
            alt={`Foto rak ${code}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 896px"
            className="pointer-events-none object-contain"
            onLoad={(e) => {
              const el = e.target as HTMLImageElement;
              imgElRef.current = el;
              setDims({ iw: el.naturalWidth, ih: el.naturalHeight });
              setAspect(el.naturalWidth / el.naturalHeight);
            }}
          />
        </div>

        {/* Circle overlay */}
        {ellipse && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {draft ? (
              <ellipse
                cx={ellipse.cx}
                cy={ellipse.cy}
                rx={ellipse.r}
                ry={ellipse.r}
                fill="none"
                stroke="#de1c24"
                strokeWidth={3}
                strokeDasharray="7 6"
              />
            ) : (
              <ellipse
                cx={ellipse.cx}
                cy={ellipse.cy}
                rx={ellipse.r}
                ry={ellipse.r}
                fill="rgba(222,28,36,0.10)"
                stroke="#de1c24"
                strokeWidth={3}
              />
            )}
          </svg>
        )}

        {/* "Lingkari" mode is ON — live red frame pulsing on the photo's sides */}
        {circling && <div aria-hidden className="stage-live pointer-events-none absolute inset-0" />}

        {/* Circling hint */}
        {circling && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white">
            Seret di foto untuk melingkari mainan yang kamu maksud
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoomAt(stage.w / 2, stage.h / 2, 1.5)}
            aria-label="Perbesar"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-600 shadow-card hover:text-slate-800 cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomAt(stage.w / 2, stage.h / 2, 1 / 1.5)}
            aria-label="Perkecil"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-600 shadow-card hover:text-slate-800 cursor-pointer"
          >
            −
          </button>
          {scale > 1.01 && (
            <button
              type="button"
              onClick={resetView}
              aria-label="Kembalikan tampilan"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-card hover:text-slate-800 cursor-pointer"
            >
              ⟲
            </button>
          )}
        </div>

        {/* Mode pills — zoom toggle + circling toggle */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleZoom}
            aria-pressed={zoomed}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-card transition-colors cursor-pointer ${
              zoomed
                ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
                : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
            }`}
          >
            {zoomed ? "Perkecil" : "Perbesar"}
          </button>
          <button
            type="button"
            onClick={() => (circling ? stopCircling() : startCircling())}
            aria-pressed={circling}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-card transition-colors cursor-pointer ${
              circling
                ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark animate-pulse"
                : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
            }`}
          >
            {circling ? "✕ Kembali" : "◯ Mau yang mana? Lingkari"}
          </button>
        </div>
      </div>

      {/* CTA bar — appears once a circle exists (hidden while fullscreen) */}
      {circle && !circling && (
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center">
          {ready ? (
            <button
              type="button"
              onClick={handleAsk}
              disabled={sending}
              className="rounded-full bg-[#25D366] hover:bg-[#1FB356] disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-extrabold text-white transition-colors chip-spring cursor-pointer"
            >
              {sending ? "Membuka WhatsApp..." : "Penasaran sama produk ini?"}
            </button>
          ) : (
            <span className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-400">
              Toko ini belum punya WhatsApp aktif
            </span>
          )}
          <button
            type="button"
            onClick={() => setCircle(null)}
            className="text-left text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Hapus lingkaran
          </button>
          {error && <span className="text-xs font-semibold text-bimbi-pink-dark">⚠️ {error}</span>}
        </div>
      )}
    </div>
  );
}
