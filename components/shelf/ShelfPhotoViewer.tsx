"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isContactReady, waLink } from "@/lib/storeContacts";

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const CONTROL_SELECTOR = "button, a, [role=button]";

function onControl(e: React.PointerEvent | React.MouseEvent) {
  return (
    e.target instanceof Element &&
    e.target.closest(CONTROL_SELECTOR) !== null
  );
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

  // ---------------------------------------------------------------------------
  // PHOTO GEOMETRY
  // ---------------------------------------------------------------------------

  const [aspect, setAspect] = useState<number | null>(null);
  const [dims, setDims] = useState<{
    iw: number;
    ih: number;
  } | null>(null);

  const [stage, setStage] = useState({
    w: 0,
    h: 0,
  });

  const imgElRef = useRef<HTMLImageElement | null>(null);

  // ---------------------------------------------------------------------------
  // PAN / ZOOM
  // ---------------------------------------------------------------------------

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // ---------------------------------------------------------------------------
  // MARKING
  // ---------------------------------------------------------------------------

  const [marking, setMarking] = useState(false);
  const [mark, setMark] = useState<Rect | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  const draftRef = useRef<Rect | null>(null);

  const setDraftRect = (r: Rect | null) => {
    draftRef.current = r;
    setDraft(r);
  };

  // ---------------------------------------------------------------------------
  // POINTER STATE
  // ---------------------------------------------------------------------------

  const pointers = useRef(
    new Map<number, { x: number; y: number }>(),
  );

  const pinchPrev = useRef<{
    dist: number;
    mx: number;
    my: number;
  } | null>(null);

  const drawStart = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const panStart = useRef<{
    px: number;
    py: number;
    tx: number;
    ty: number;
  } | null>(null);

  const moved = useRef(false);

  const lastTap = useRef<{
    t: number;
    x: number;
    y: number;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // ASK / WHATSAPP
  // ---------------------------------------------------------------------------

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isContactReady(whatsapp);

  // ---------------------------------------------------------------------------
  // DISPLAY GEOMETRY
  // ---------------------------------------------------------------------------

  const fit =
    dims && stage.w > 0 && stage.h > 0
      ? Math.min(stage.w / dims.iw, stage.h / dims.ih)
      : 0;

  const f = fit * scale;

  const disp = dims
    ? {
        w: dims.iw * f,
        h: dims.ih * f,
      }
    : {
        w: 0,
        h: 0,
      };

  const ox = dims
    ? (stage.w - disp.w) / 2 + tx
    : 0;

  const oy = dims
    ? (stage.h - disp.h) / 2 + ty
    : 0;

  const clampPan = (
    nx: number,
    ny: number,
    ns: number,
  ): [number, number] => {
    if (!dims) return [0, 0];

    const mx = Math.max(
      0,
      (dims.iw * fit * ns - stage.w) / 2,
    );

    const my = Math.max(
      0,
      (dims.ih * fit * ns - stage.h) / 2,
    );

    return [
      Math.min(mx, Math.max(-mx, nx)),
      Math.min(my, Math.max(-my, ny)),
    ];
  };

  // ---------------------------------------------------------------------------
  // ZOOM
  // ---------------------------------------------------------------------------

  const zoomAt = (
    px: number,
    py: number,
    factor: number,
  ) => {
    if (!dims) return;

    const ns = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, scale * factor),
    );

    const k = ns / scale;

    const nx =
      px -
      (px - ox) * k -
      (stage.w - dims.iw * fit * ns) / 2;

    const ny =
      py -
      (py - oy) * k -
      (stage.h - dims.ih * fit * ns) / 2;

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
    if (zoomed) {
      resetView();
    } else {
      zoomAt(
        stage.w / 2,
        stage.h / 2,
        DOUBLE_TAP_SCALE,
      );
    }
  };

  // ---------------------------------------------------------------------------
  // IMAGE COORDINATES
  // ---------------------------------------------------------------------------

  const toImage = (x: number, y: number) => {
    if (!f) return null;

    return {
      x: (x - ox) / f,
      y: (y - oy) / f,
    };
  };

  // ---------------------------------------------------------------------------
  // MARKING MODE
  // ---------------------------------------------------------------------------

  const startMarking = () => {
    setMarking(true);
    setDraftRect(null);
    resetView();
  };

  const stopMarking = () => {
    setMarking(false);
    setDraftRect(null);
  };

  // ---------------------------------------------------------------------------
  // ESC + BODY LOCK
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!marking && !mark) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (marking) {
        setMarking(false);
        draftRef.current = null;
        setDraft(null);
      } else {
        setMark(null);
      }
    };

    window.addEventListener("keydown", onKey);

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow =
        previousOverflow;
    };
  }, [marking, mark]);

  // ---------------------------------------------------------------------------
  // WHEEL ZOOM
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const el = stageRef.current;

    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = el.getBoundingClientRect();

      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        e.deltaY < 0 ? 1.15 : 1 / 1.15,
      );
    };

    el.addEventListener("wheel", onWheel, {
      passive: false,
    });

    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  });

  // ---------------------------------------------------------------------------
  // RESIZE OBSERVER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const el = stageRef.current;

    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();

      setStage({
        w: r.width,
        h: r.height,
      });
    });

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // POINTER HELPERS
  // ---------------------------------------------------------------------------

  const localPos = (e: React.PointerEvent) => {
    const r =
      stageRef.current!.getBoundingClientRect();

    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    };
  };

  // ---------------------------------------------------------------------------
  // POINTER DOWN
  // ---------------------------------------------------------------------------

  function handlePointerDown(
    e: React.PointerEvent,
  ) {
    if (onControl(e)) return;

    if (!dims) return;

    try {
      stageRef.current?.setPointerCapture(
        e.pointerId,
      );
    } catch {}

    const p = localPos(e);

    pointers.current.set(e.pointerId, p);

    moved.current = false;

    if (pointers.current.size === 2) {
      drawStart.current = null;
      setDraftRect(null);
      panStart.current = null;

      const [a, b] = [
        ...pointers.current.values(),
      ];

      pinchPrev.current = {
        dist: Math.hypot(
          a.x - b.x,
          a.y - b.y,
        ),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };

      return;
    }

    if (marking) {
      const s = toImage(p.x, p.y);

      if (s) {
        drawStart.current = {
          x: Math.min(
            Math.max(s.x, 0),
            dims.iw,
          ),
          y: Math.min(
            Math.max(s.y, 0),
            dims.ih,
          ),
        };
      }
    } else {
      panStart.current = {
        px: p.x,
        py: p.y,
        tx,
        ty,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // POINTER MOVE
  // ---------------------------------------------------------------------------

  function handlePointerMove(
    e: React.PointerEvent,
  ) {
    if (
      !pointers.current.has(e.pointerId)
    ) {
      return;
    }

    const p = localPos(e);

    const prev =
      pointers.current.get(e.pointerId)!;

    if (
      Math.hypot(
        p.x - prev.x,
        p.y - prev.y,
      ) > 2
    ) {
      moved.current = true;
    }

    pointers.current.set(
      e.pointerId,
      p,
    );

    // Pinch
    if (
      pointers.current.size >= 2 &&
      pinchPrev.current &&
      dims
    ) {
      const [a, b] = [
        ...pointers.current.values(),
      ];

      const dist = Math.hypot(
        a.x - b.x,
        a.y - b.y,
      );

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;

      const pp = pinchPrev.current;

      if (dist > 0 && pp.dist > 0) {
        const ns = Math.min(
          MAX_SCALE,
          Math.max(
            MIN_SCALE,
            scale * (dist / pp.dist),
          ),
        );

        const k = ns / scale;

        const sx =
          ox + (mx - pp.mx);

        const sy =
          oy + (my - pp.my);

        const nx =
          mx -
          (mx - sx) * k -
          (stage.w -
            dims.iw * fit * ns) /
            2;

        const ny =
          my -
          (my - sy) * k -
          (stage.h -
            dims.ih * fit * ns) /
            2;

        const [cx2, cy2] =
          clampPan(nx, ny, ns);

        setScale(ns);
        setTx(cx2);
        setTy(cy2);
      }

      pinchPrev.current = {
        dist,
        mx,
        my,
      };

      return;
    }

    // Drawing
    if (
      marking &&
      drawStart.current &&
      dims
    ) {
      const cur = toImage(
        p.x,
        p.y,
      );

      if (cur) {
        const s =
          drawStart.current;

        const ex = Math.min(
          Math.max(cur.x, 0),
          dims.iw,
        );

        const ey = Math.min(
          Math.max(cur.y, 0),
          dims.ih,
        );

        setDraftRect({
          x: Math.min(
            s.x,
            ex,
          ),
          y: Math.min(
            s.y,
            ey,
          ),
          w: Math.abs(
            ex - s.x,
          ),
          h: Math.abs(
            ey - s.y,
          ),
        });
      }

      return;
    }

    // Panning
    if (panStart.current) {
      const ps =
        panStart.current;

      const [nx, ny] =
        clampPan(
          ps.tx +
            (p.x - ps.px),
          ps.ty +
            (p.y - ps.py),
          scale,
        );

      setTx(nx);
      setTy(ny);
    }
  }

  // ---------------------------------------------------------------------------
  // POINTER UP
  // ---------------------------------------------------------------------------

  function handlePointerUp(
    e: React.PointerEvent,
  ) {
    const p =
      pointers.current.get(
        e.pointerId,
      ) ?? null;

    pointers.current.delete(
      e.pointerId,
    );

    if (
      pointers.current.size < 2
    ) {
      pinchPrev.current = null;
    }

    if (!p) {
      lastTap.current = null;
      return;
    }

    // Finish drawing
    if (
      marking &&
      drawStart.current
    ) {
      const minPx =
        f ? 12 / f : 0;

      const d =
        draftRef.current;

      if (
        d &&
        d.w > minPx &&
        d.h > minPx
      ) {
        setMark(d);

        // Immediately leave drawing mode.
        // The committed mark now switches into askMode.
        setMarking(false);
      }

      setDraftRect(null);
      drawStart.current = null;

      return;
    }

    // Double tap zoom
    if (
      e.pointerType !== "mouse" &&
      !moved.current
    ) {
      const now = Date.now();

      const lt =
        lastTap.current;

      if (
        lt &&
        now - lt.t < 300 &&
        Math.hypot(
          p.x - lt.x,
          p.y - lt.y,
        ) < 32
      ) {
        lastTap.current = null;

        if (scale > 1.01) {
          resetView();
        } else {
          zoomAt(
            p.x,
            p.y,
            DOUBLE_TAP_SCALE,
          );
        }
      } else {
        lastTap.current = {
          t: now,
          x: p.x,
          y: p.y,
        };
      }
    }

    drawStart.current = null;
    panStart.current = null;
  }

  // ---------------------------------------------------------------------------
  // DOUBLE CLICK
  // ---------------------------------------------------------------------------

  function handleDoubleClick(
    e: React.MouseEvent,
  ) {
    if (onControl(e)) return;

    const r =
      stageRef.current!.getBoundingClientRect();

    const x =
      e.clientX - r.left;

    const y =
      e.clientY - r.top;

    if (scale > 1.01) {
      resetView();
    } else {
      zoomAt(
        x,
        y,
        DOUBLE_TAP_SCALE,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE WHATSAPP IMAGE
  // ---------------------------------------------------------------------------

  async function makeAskImage(): Promise<File | null> {
    const img =
      imgElRef.current;

    const m = mark;

    if (!img || !m || !dims) {
      return null;
    }

    const { iw, ih } = dims;

    const margin = 16;

    const l = Math.max(
      0,
      m.x - margin,
    );

    const t = Math.max(
      0,
      m.y - margin,
    );

    const rEdge = Math.min(
      iw,
      m.x + m.w + margin,
    );

    const bEdge = Math.min(
      ih,
      m.y + m.h + margin,
    );

    const w = rEdge - l;
    const h = bEdge - t;

    if (w < 8 || h < 8) {
      return null;
    }

    const GAP = 12;

    const maxByHeight =
      (1600 - GAP) /
      (h / w + ih / iw);

    const W = Math.max(
      64,
      Math.min(
        800,
        Math.max(w, iw),
        maxByHeight,
      ),
    );

    const sc = W / w;
    const sf = W / iw;

    const cw = Math.max(
      1,
      Math.round(W),
    );

    const hc = Math.max(
      1,
      Math.round(h * sc),
    );

    const hf = Math.max(
      1,
      Math.round(ih * sf),
    );

    const ch =
      hc + GAP + hf;

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width = cw;
    canvas.height = ch;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return null;

    let source: CanvasImageSource =
      img;

    let kx = 1;
    let ky = 1;

    let bmp:
      | ImageBitmap
      | null = null;

    if (
      typeof createImageBitmap ===
      "function"
    ) {
      try {
        bmp =
          await createImageBitmap(
            img,
          );

        source = bmp;

        kx =
          bmp.width / iw;

        ky =
          bmp.height / ih;
      } catch {
        bmp = null;
      }
    }

    try {
      ctx.fillStyle = "#fff";

      ctx.fillRect(
        0,
        0,
        cw,
        ch,
      );

      ctx.lineWidth =
        Math.max(
          3,
          cw * 0.012,
        );

      ctx.strokeStyle =
        "#de1c24";

      // Crop
      ctx.drawImage(
        source,
        l * kx,
        t * ky,
        w * kx,
        h * ky,
        0,
        0,
        cw,
        hc,
      );

      ctx.strokeRect(
        (m.x - l) * sc,
        (m.y - t) * sc,
        m.w * sc,
        m.h * sc,
      );

      // Full image
      ctx.drawImage(
        source,
        0,
        0,
        iw * kx,
        ih * ky,
        0,
        hc + GAP,
        cw,
        hf,
      );

      ctx.strokeRect(
        m.x * sf,
        hc +
          GAP +
          m.y * sf,
        m.w * sf,
        m.h * sf,
      );
    } finally {
      bmp?.close();
    }

    const blob =
      await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.85,
          ),
      );

    if (!blob) return null;

    return new File(
      [blob],
      "rak.jpg",
      {
        type: "image/jpeg",
      },
    );
  }

  // ---------------------------------------------------------------------------
  // WHATSAPP CTA
  // ---------------------------------------------------------------------------

  async function handleAsk() {
    if (!ready || sending) {
      return;
    }

    setError(null);

    const popup =
      window.open(
        "",
        "_blank",
      );

    setSending(true);

    try {
      const file =
        await makeAskImage();

      if (!file) {
        throw new Error(
          "image failed",
        );
      }

      const fd =
        new FormData();

      fd.append(
        "file",
        file,
      );

      fd.append(
        "shelfId",
        shelfId,
      );

      const res =
        await fetch(
          "/api/shelf-ask",
          {
            method: "POST",
            body: fd,
          },
        );

      const data =
        (await res
          .json()
          .catch(
            () => ({}),
          )) as {
          url?: string;
          error?: string;
        };

      if (
        !res.ok ||
        !data.url
      ) {
        throw new Error(
          data.error ??
            "upload failed",
        );
      }

      const cropUrl =
        new URL(
          data.url,
          window.location.origin,
        ).toString();

      const msg =
        `Halo, saya penasaran sama produk ini di toko, boleh tahu harga dan detail ga ya?\n\n` +
        `Rak ${code} — ${name} (${storeName})\n` +
        `Lihat bagian yang saya tandai: ${cropUrl}`;

      const href =
        waLink(
          whatsapp,
          msg,
        );

      if (popup) {
        popup.location.href =
          href;
      } else {
        window.open(
          href,
          "_blank",
        );
      }
    } catch (err) {
      popup?.close();

      setError(
        err instanceof Error &&
          err.message !==
            "image failed" &&
          err.message !==
            "upload failed"
          ? err.message
          : "Gagal menyiapkan foto. Coba lagi ya.",
      );
    } finally {
      setSending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // MARK DISPLAY
  // ---------------------------------------------------------------------------

  const shown =
    draft ?? mark;

  const rv =
    shown && f
      ? {
          x:
            shown.x * f +
            ox,
          y:
            shown.y * f +
            oy,
          w:
            shown.w * f,
          h:
            shown.h * f,
        }
      : null;

  // A committed mark means the fullscreen ask presentation is active.
  const askMode =
    !!mark && !marking;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      className={
        marking || mark
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
      }
    >
      <div
        ref={stageRef}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
        onDoubleClick={
          handleDoubleClick
        }
        className={`relative overflow-hidden select-none ${
          marking || mark
            ? "h-full w-full rounded-xl bg-black"
            : "w-full bg-slate-100"
        } ${
          marking ||
          scale > 1.01
            ? "touch-none"
            : "touch-pan-y"
        } ${
          marking
            ? "cursor-crosshair"
            : "cursor-grab"
        }`}
        style={
          marking || mark
            ? undefined
            : aspect
              ? {
                  aspectRatio:
                    String(
                      aspect,
                    ),
                }
              : {
                  aspectRatio:
                    "4 / 3",
                }
        }
      >
        {/* ---------------------------------------------------------------- */}
        {/* PHOTO                                                            */}
        {/* ---------------------------------------------------------------- */}

        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          <Image
            src={image}
            alt={`Foto rak ${code}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 896px"
            className="pointer-events-none object-contain"
            onLoad={(e) => {
              const el =
                e.target as HTMLImageElement;

              imgElRef.current =
                el;

              setDims({
                iw: el.naturalWidth,
                ih: el.naturalHeight,
              });

              setAspect(
                el.naturalWidth /
                  el.naturalHeight,
              );
            }}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* ASK MODE DARK OVERLAY                                            */}
        {/* ---------------------------------------------------------------- */}

        {askMode && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-black/55"
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* MARK OVERLAY                                                     */}
        {/* ---------------------------------------------------------------- */}

        {rv && (
          <svg
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            aria-hidden
          >
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

        {/* ---------------------------------------------------------------- */}
        {/* LIVE MARKING BORDER                                              */}
        {/* ---------------------------------------------------------------- */}

        {marking && (
          <div
            aria-hidden
            className="stage-live pointer-events-none absolute inset-0 z-20"
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* MARKING HINT                                                     */}
        {/* ---------------------------------------------------------------- */}

        {marking && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white">
            Seret di foto untuk menandai mainan yang kamu maksud
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* ZOOM CONTROLS                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="absolute top-3 right-3 z-40 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() =>
              zoomAt(
                stage.w / 2,
                stage.h / 2,
                1.5,
              )
            }
            aria-label="Perbesar"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-600 shadow-card hover:text-slate-800"
          >
            +
          </button>

          <button
            type="button"
            onClick={() =>
              zoomAt(
                stage.w / 2,
                stage.h / 2,
                1 / 1.5,
              )
            }
            aria-label="Perkecil"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-600 shadow-card hover:text-slate-800"
          >
            −
          </button>

          {scale > 1.01 && (
            <button
              type="button"
              onClick={resetView}
              aria-label="Kembalikan tampilan"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-card hover:text-slate-800"
            >
              ⟲
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* MODE CONTROLS                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="absolute bottom-3 left-3 z-40 flex flex-wrap items-center gap-2">
          {askMode ? (
            <button
              type="button"
              onClick={() =>
                setMark(null)
              }
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-bimbi-ink shadow-card transition-colors hover:border-bimbi-pink/50"
            >
              ✕ Tutup
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={
                  toggleZoom
                }
                aria-pressed={
                  zoomed
                }
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-card transition-colors ${
                  zoomed
                    ? "border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
                    : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
                }`}
              >
                {zoomed
                  ? "Perkecil"
                  : "Perbesar"}
              </button>

              <button
                type="button"
                onClick={() =>
                  marking
                    ? stopMarking()
                    : startMarking()
                }
                aria-pressed={
                  marking
                }
                data-tour="tandai"
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-card transition-colors ${
                  marking
                    ? "animate-pulse border-bimbi-pink bg-bimbi-sun text-bimbi-pink-dark"
                    : "border-slate-300 bg-white text-bimbi-ink hover:border-bimbi-pink/50"
                }`}
              >
                {marking
                  ? "✕ Kembali"
                  : "▢ Mau yang mana? Tandai"}
              </button>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* ASK CTA                                                          */}
        {/* ---------------------------------------------------------------- */}

        {askMode && (
          <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 text-center">
            {ready ? (
              <button
                type="button"
                onClick={
                  handleAsk
                }
                disabled={
                  sending
                }
                className="pointer-events-auto cursor-pointer rounded-full bg-[#25D366] px-8 py-3.5 text-base font-extrabold text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-all hover:bg-[#1FB356] disabled:cursor-not-allowed disabled:opacity-60 sm:px-10 sm:py-4 sm:text-lg"
              >
                {sending
                  ? "Membuka WhatsApp..."
                  : "Tanyakan tentang produk ini"}
              </button>
            ) : (
              <span className="pointer-events-auto rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-slate-400 shadow-lg">
                Toko ini belum punya WhatsApp aktif
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                setMark(null)
              }
              className="pointer-events-auto cursor-pointer rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-slate-600 shadow-lg transition-colors hover:bg-white hover:text-slate-800"
            >
              Hapus tanda
            </button>

            {error && (
              <span className="pointer-events-auto rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-bimbi-pink-dark shadow-lg">
                ⚠️ {error}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}