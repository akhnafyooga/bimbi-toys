"use client";

import { useEffect, useRef, useState } from "react";

type Pan = { x: number; y: number };

const DRAG_THRESHOLD_PX = 5;
const KEY_PAN_PX = 200;
const FOCUS_MARGIN_PX = 24;

// Free-roam board: a fixed-size plane the shopper drags around inside a
// viewport-clipped stage — Figma-style, hand-rolled with pointer events like
// ShelfPhotoViewer (no pan/zoom dependency).
//
// Input choreography:
//   mouse/pen  drag anywhere to pan; wheel pans too (shift = horizontal only)
//   touch      one finger pans the board in 2D; the page is still scrollable
//              from the masthead above / the strip below the stage
//   keyboard   arrow keys pan by ~half a card when the stage is focused, and
//              tabbing to a card pans it into view
// A ~5px threshold separates "drag the board" from "click a card": the click
// is swallowed on capture unless the gesture stayed a tap.
export default function ShelfCanvas({
  board,
  children,
}: {
  board: { width: number; height: number };
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // panRef mirrors the state for the event handlers / rAF loop, which need
  // the latest value without waiting for a re-render. Every mutation flows
  // through applyPan (which updates both), so the ref never needs syncing
  // during render — initial mount already starts equal to the initial state.
  const panRef = useRef(pan);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const centroid = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const samples = useRef<{ t: number; pan: Pan }[]>([]);
  const raf = useRef(0);

  // clampPan is recreated each render (it closes over `board`); handlers
  // that outlive a render (wheel listener, inertia frames) read it through
  // this ref, refreshed after every commit — never during render.
  const clampPan = (p: Pan): Pan => {
    const el = stageRef.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    const minX = Math.min(0, w - board.width);
    const minY = Math.min(0, h - board.height);
    return {
      x: minX >= 0 ? minX / 2 : Math.min(0, Math.max(minX, p.x)),
      y: minY >= 0 ? minY / 2 : Math.min(0, Math.max(minY, p.y)),
    };
  };
  const clampRef = useRef(clampPan);
  useEffect(() => {
    clampRef.current = clampPan;
  });

  const applyPan = (p: Pan) => {
    const target = clampRef.current(p);
    panRef.current = target;
    setPan(target);
  };

  const stopInertia = () => cancelAnimationFrame(raf.current);

  // Release: coast with the velocity of the last ~90ms of the drag,
  // frame-rate-independently decaying, clamped at the board's edges.
  const startInertia = () => {
    const now = performance.now();
    const recent = samples.current.filter((s) => now - s.t < 90);
    if (recent.length < 2) return;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = Math.max(1, last.t - first.t);
    let vx = (last.pan.x - first.pan.x) / dt;
    let vy = (last.pan.y - first.pan.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed < 0.05) return;
    const cap = 1.8; // px/ms — brisk but never a slingshot
    if (speed > cap) {
      vx = (vx / speed) * cap;
      vy = (vy / speed) * cap;
    }
    let lastT = now;
    const step = (t: number) => {
      const frameMs = Math.min(32, t - lastT);
      lastT = t;
      applyPan({ x: panRef.current.x + vx * frameMs, y: panRef.current.y + vy * frameMs });
      const decay = Math.pow(0.93, frameMs / 16.7);
      vx *= decay;
      vy *= decay;
      if (Math.hypot(vx, vy) > 0.02) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  function trackPointer(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function currentCentroid(): Pan {
    const pts = [...pointers.current.values()];
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    stopInertia();
    trackPointer(e);
    stageRef.current?.setPointerCapture(e.pointerId);
    if (pointers.current.size === 1) {
      moved.current = false;
      gestureStart.current = { x: e.clientX, y: e.clientY, pan: panRef.current };
      centroid.current = null;
    } else {
      // Second finger landed: switch to centroid steering from here.
      gestureStart.current = null;
      centroid.current = currentCentroid();
    }
    samples.current = [{ t: performance.now(), pan: panRef.current }];
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    trackPointer(e);

    if (pointers.current.size >= 2 && centroid.current) {
      const next = currentCentroid();
      const dx = next.x - centroid.current.x;
      const dy = next.y - centroid.current.y;
      centroid.current = next;
      if (dx !== 0 || dy !== 0) {
        moved.current = true;
        setDragging(true);
        applyPan({ x: panRef.current.x + dx, y: panRef.current.y + dy });
        samples.current.push({ t: performance.now(), pan: panRef.current });
        if (samples.current.length > 8) samples.current.shift();
      }
      return;
    }

    const g = gestureStart.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      moved.current = true;
      setDragging(true);
    }
    if (moved.current) {
      applyPan({ x: g.pan.x + dx, y: g.pan.y + dy });
      samples.current.push({ t: performance.now(), pan: panRef.current });
      if (samples.current.length > 8) samples.current.shift();
    }
  }

  function onPointerRelease(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be gone if the browser cancelled the gesture
    }

    if (pointers.current.size === 0) {
      setDragging(false);
      centroid.current = null;
      // pointercancel = the browser took the gesture over; no inertia.
      if (moved.current && e.type === "pointerup") startInertia();
    } else if (pointers.current.size === 1) {
      // Back to one finger: restart single-pointer steering from where it is.
      const [only] = [...pointers.current.values()];
      gestureStart.current = { x: only.x, y: only.y, pan: panRef.current };
      centroid.current = null;
      samples.current = [{ t: performance.now(), pan: panRef.current }];
    }
  }

  function onClickCapture(e: React.MouseEvent) {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const deltas: Record<string, Pan> = {
      ArrowLeft: { x: KEY_PAN_PX, y: 0 },
      ArrowRight: { x: -KEY_PAN_PX, y: 0 },
      ArrowUp: { x: 0, y: KEY_PAN_PX },
      ArrowDown: { x: 0, y: -KEY_PAN_PX },
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    stopInertia();
    applyPan({ x: panRef.current.x + d.x, y: panRef.current.y + d.y });
  }

  // Tabbing into a card that sits outside the viewport? Pan the board so the
  // focused card is visible — the stage clips, it does not scroll.
  function onFocusCapture(e: React.FocusEvent) {
    const el = e.target as HTMLElement;
    const stage = stageRef.current;
    if (!stage || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    let { x, y } = panRef.current;
    if (r.left < s.left + FOCUS_MARGIN_PX) x += s.left + FOCUS_MARGIN_PX - r.left;
    if (r.right > s.right - FOCUS_MARGIN_PX) x -= r.right - (s.right - FOCUS_MARGIN_PX);
    if (r.top < s.top + FOCUS_MARGIN_PX) y += s.top + FOCUS_MARGIN_PX - r.top;
    if (r.bottom > s.bottom - FOCUS_MARGIN_PX) y -= r.bottom - (s.bottom - FOCUS_MARGIN_PX);
    if (x !== panRef.current.x || y !== panRef.current.y) applyPan({ x, y });
  }

  // Wheel pans the board (non-passive so the page itself does not scroll).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      applyPan({ x: panRef.current.x - dx, y: panRef.current.y - dy });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Viewport size changes (rotate, resize) re-clamp the current pan.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => applyPan(panRef.current));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      role="region"
      aria-label="Papan rak toko — seret ke segala arah untuk menjelajahi"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerRelease}
      onPointerCancel={onPointerRelease}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
      onFocusCapture={onFocusCapture}
      className={`shelf-stage relative h-full w-full touch-none select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-bimbi-sky/60 ${
        dragging ? "is-dragging" : ""
      }`}
    >
      <div
        className="shelf-board absolute left-0 top-0"
        style={{
          width: board.width,
          height: board.height,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
