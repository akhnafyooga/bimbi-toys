"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isContactReady, waLink } from "@/lib/storeContacts";

// Interactive stage for a shelf photo on the shelf detail page.
//
// Inline mode: pan (drag) + zoom (wheel/pinch/double-tap/pills) so shoppers
// can look at the rack up close. Pressing "Mau yang mana? Tandai" blows the
// photo up to a fullscreen, darkened + blurred overlay separated from the
// page — one drag there draws a rectangle around the product the shopper is
// curious about, then the mode auto-exits and the WhatsApp CTA
// "Penasaran sama produk ini?" appears. Tapping it crops the marked area to
// a JPEG, uploads it, and opens a wa.me chat with the store (wa.me can only
// prefill text, so the message carries the crop's URL).
//
// The floating controls (zoom pills, mode pills) live INSIDE the stage, so
// every stage pointer handler bails out when the press started on a control:
// without that, the stage's setPointerCapture retargets the click away from
// the pill (first press does nothing) and the follow-up press registers as a
// double-tap zoom instead — the pill would "serve the same purpose as
// perbesar".
//
// Everything is hand-rolled with pointer events — no viewer dependency.

type Rect = { x: number; y: number; w: number; h: number }; // natural image pixels, x/y = top-left

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const CONTROL_SELECTOR = "button, a, [role=button]";

// Did this event land on (or bubble from) one of the floating controls?
function onControl(e: React.PointerEvent | React.MouseEvent) {
  return e.target instanceof Element && e.target.closest(CONTROL_SELECTOR) !== null;
}

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

  // Marking mode + the drawn mark (committed) / in-progress draft.
  const [marking, setMarking] = useState(false);
  const [mark, setMark] = useState<Rect | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  // Mirror of `draft`: pointerup reads the ref, not the render closure — a
  // fast flick can end before React re-renders, and the closure would be
  // stale (the mark would silently vanish).
  const draftRef = useRef<Rect | null>(null);
  const setDraftRect = (r: Rect | null) => {
    draftRef.current = r;
    setDraft(r);
  };

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

  const startMarking = () => {
    setMarking(true);
    setDraftRect(null);
    resetView(); // a clean 1x canvas is the easiest to draw on
  };

  const stopMarking = () => {
    setMarking(false);
    setDraftRect(null);
  };

  // Esc exits marking; lock page scroll while the fullscreen stage is up.
  // The keydown handler inlines what stopMarking does (setters + ref only) so
  // the effect genuinely depends on nothing but `marking`.
  useEffect(() => {
    if (!marking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMarking(false);
      draftRef.current = null;
      setDraft(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [marking]);

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
    if (onControl(e)) return; // presses on the pills belong to the pills
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
      setDraftRect(null);
      panStart.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchPrev.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }

    if (marking) {
      const s = toImage(p.x, p.y);
      // Clamp to the photo itself — presses in the letterboxed black area
      // shouldn't anchor a mark outside the picture.
      if (s) {
        drawStart.current = { x: Math.min(Math.max(s.x, 0), dims.iw), y: Math.min(Math.max(s.y, 0), dims.ih) };
      }
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

    // Drawing: rectangle from the press point to the current point, in any
    // drag direction, clamped to the photo.
    if (marking && drawStart.current && dims) {
      const cur = toImage(p.x, p.y);
      if (cur) {
        const s = drawStart.current;
        const ex = Math.min(Math.max(cur.x, 0), dims.iw);
        const ey = Math.min(Math.max(cur.y, 0), dims.ih);
        setDraftRect({
          x: Math.min(s.x, ex),
          y: Math.min(s.y, ey),
          w: Math.abs(ex - s.x),
          h: Math.abs(ey - s.y),
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
    if (!p) {
      // An untracked release — e.g. a press that began on one of the pills.
      // It can't finish a pan or a mark, and it also breaks any tap chain so
      // a pill press between two photo taps can't forge a double-tap zoom.
      lastTap.current = null;
      return;
    }

    // Finish drawing: commit the mark if it's big enough to be intentional
    // (both sides ≥ 12 screen px), then auto-exit marking mode (one mark at
    // a time, toggle to redo). Read the draft from the ref — see draftRef.
    if (marking && drawStart.current) {
      const minPx = f ? 12 / f : 0;
      const d = draftRef.current;
      if (d && d.w > minPx && d.h > minPx) {
        setMark(d);
        setMarking(false);
      }
      setDraftRect(null);
      drawStart.current = null;
      return;
    }

    // Double-tap zoom (touch). Mouse uses onDoubleClick below.
    if (e.pointerType !== "mouse" && !moved.current) {
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

    // End the single-pointer bookkeeping so the next press starts clean.
    drawStart.current = null;
    panStart.current = null;
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (onControl(e)) return; // a double click on a pill must not zoom
    const r = stageRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (scale > 1.01) resetView();
    else zoomAt(x, y, DOUBLE_TAP_SCALE);
  }

  // Crop the marked region to a JPEG (≤800px, the mark re-drawn on top).
  async function makeCropFile(): Promise<File | null> {
    const img = imgElRef.current;
    const m = mark;
    if (!img || !m || !dims) return null;
    const { iw, ih } = dims;

    // A little breathing room around the mark so the red frame reads inside
    // the crop; clamped to the photo's edges.
    const margin = 16;
    const l = Math.max(0, m.x - margin);
    const t = Math.max(0, m.y - margin);
    const rEdge = Math.min(iw, m.x + m.w + margin);
    const bEdge = Math.min(ih, m.y + m.h + margin);
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

    // Sample from an ImageBitmap, not the <img>: the bitmap is decoded with
    // EXIF orientation applied and independently of which srcset rendition
    // the element is showing, so source-rect sampling matches the mark's
    // coordinate space (drawing a source rect straight from an <img> is the
    // one layer where browsers still mis-handle orientation/rendition size).
    // kx/ky map the mark (naturalWidth/Height space) onto the bitmap's own
    // pixel space in case its dimensions differ.
    let source: CanvasImageSource = img;
    let kx = 1;
    let ky = 1;
    let bmp: ImageBitmap | null = null;
    if (typeof createImageBitmap === "function") {
      try {
        bmp = await createImageBitmap(img);
        source = bmp;
        kx = bmp.width / iw;
        ky = bmp.height / ih;
      } catch {
        bmp = null; // decode refused — draw the <img> directly after all
      }
    }

    try {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(source, l * kx, t * ky, w * kx, h * ky, 0, 0, cw, ch);
      // Re-draw the shopper's mark on top of the crop (canvas space = the
      // marked region plus margin, scaled by s).
      ctx.lineWidth = Math.max(3, cw * 0.012);
      ctx.strokeStyle = "#de1c24";
      ctx.strokeRect((m.x - l) * s, (m.y - t) * s, m.w * s, m.h * s);
    } finally {
      bmp?.close();
    }

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
      const msg = `Halo, saya penasaran sama produk ini di toko, boleh tahu harga dan detail ga ya?\n\nRak ${code} — ${name} (${storeName})\nLihat bagian yang saya tandai: ${cropUrl}`;
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

  const shown = draft ?? mark;
  const rv = shown && f ? { x: shown.x * f + ox, y: shown.y * f + oy, w: shown.w * f, h: shown.h * f } : null;

  return (
    // Inline: a card. Marking: a fullscreen, darkened + blurred overlay
    // floating in front of the page. Same DOM node either way — only classes
    // change, so the stage keeps its refs, observers, and loaded image.
    <div
      className={
        marking
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
          marking ? "h-full w-full rounded-xl bg-black" : "w-full bg-slate-100"
        } ${
          marking || scale > 1.01 ? "touch-none" : "touch-pan-y"
        } ${marking ? "cursor-crosshair" : "cursor-grab"}`}
        style={marking ? undefined : aspect ? { aspectRatio: String(aspect) } : { aspectRatio: "4 / 3" }}
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

        {/* Mark overlay */}
        {rv && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {draft ? (
              <rect
                x={rv.x}
                y={rv.y}
                width={rv.w}
                height={rv.h}
                fill="none"
                stroke="#de1c24"
                strokeWidth={3}
                strokeDasharray="7 6"
              />
            ) : (
              <rect
                x={rv.x}
                y={rv.y}
                width={rv.w}
                height={rv.h}
                fill="rgba(222,28,36,0.10)"
                stroke="#de1c24"
                strokeWidth={3}
              />
            )}
          </svg>
        )}

        {/* "Tandai" mode is ON — live red frame pulsing on the photo's sides */}
        {marking && <div aria-hidden className="stage-live pointer-events-none absolute inset-0" />}

        {/* Marking hint */}
        {marking && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white">
            Seret di foto untuk menandai mainan yang kamu maksud
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

        {/* Mode pills — zoom toggle + marking toggle */}
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
            onClick={() => (marking ? stopMarking() : startMarking())}
            aria-pressed={marking}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-card transition-colors cursor-pointer ${
              marking
                ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark animate-pulse"
                : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
            }`}
          >
            {marking ? "✕ Kembali" : "▢ Mau yang mana? Tandai"}
          </button>
        </div>

        {/* Ask CTA — big, floating dead-center over the photo once a mark
            exists (hidden while fullscreen). The overlay is click-through so
            panning/zooming the photo still works; only the buttons catch
            presses. */}
        {mark && !marking && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {ready ? (
              <button
                type="button"
                onClick={handleAsk}
                disabled={sending}
                className="pointer-events-auto rounded-full bg-[#25D366] hover:bg-[#1FB356] disabled:opacity-60 disabled:cursor-not-allowed px-8 py-3.5 text-base sm:text-lg font-extrabold text-white shadow-lg transition-colors chip-spring cursor-pointer"
              >
                {sending ? "Membuka WhatsApp..." : "Penasaran sama produk ini?"}
              </button>
            ) : (
              <span className="rounded-full bg-white/90 px-6 py-3 text-sm font-bold text-slate-400 shadow-lg">
                Toko ini belum punya WhatsApp aktif
              </span>
            )}
            <button
              type="button"
              onClick={() => setMark(null)}
              className="pointer-events-auto rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Hapus tanda
            </button>
            {error && (
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-bimbi-pink-dark">
                ⚠️ {error}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
