
"use client";

import { useEffect, useRef, useState } from "react";

type Pan = { x: number; y: number };

const DRAG_THRESHOLD_PX = 5;
const KEY_PAN_PX = 200;
const FOCUS_MARGIN_PX = 24;

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 110;
const MINIMAP_PADDING = 6;

export default function ShelfCanvas({
  board,
  children,
}: {
  board: { width: number; height: number };
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState<Pan>({
    x: 0,
    y: 0,
  });

  const panRef = useRef<Pan>(pan);

  const [dragging, setDragging] = useState(false);

  const [stageSize, setStageSize] = useState({
    width: 0,
    height: 0,
  });

  const pointers = useRef(
    new Map<number, { x: number; y: number }>()
  );

  const gestureStart = useRef<{
    x: number;
    y: number;
    pan: Pan;
  } | null>(null);

  const centroid = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const moved = useRef(false);

  const samples = useRef<
    { t: number; pan: Pan }[]
  >([]);

  const raf = useRef(0);

  // ============================================================
  // PAN CLAMPING
  // ============================================================

  const clampPan = (p: Pan): Pan => {
    const el = stageRef.current;

    const width = el?.clientWidth ?? 0;
    const height = el?.clientHeight ?? 0;

    const minX = Math.min(0, width - board.width);
    const minY = Math.min(0, height - board.height);

    return {
      x:
        minX >= 0
          ? minX / 2
          : Math.min(
              0,
              Math.max(minX, p.x)
            ),

      y:
        minY >= 0
          ? minY / 2
          : Math.min(
              0,
              Math.max(minY, p.y)
            ),
    };
  };

  const clampRef = useRef(clampPan);

  useEffect(() => {
    clampRef.current = clampPan;
  });

  const applyPan = (next: Pan) => {
    const target = clampRef.current(next);

    panRef.current = target;
    setPan(target);
  };

  const stopInertia = () => {
    cancelAnimationFrame(raf.current);
  };

  // ============================================================
  // INERTIA
  // ============================================================

  const startInertia = () => {
    const now = performance.now();

    const recent = samples.current.filter(
      (sample) => now - sample.t < 90
    );

    if (recent.length < 2) return;

    const first = recent[0];
    const last = recent[recent.length - 1];

    const dt = Math.max(
      1,
      last.t - first.t
    );

    let vx =
      (last.pan.x - first.pan.x) / dt;

    let vy =
      (last.pan.y - first.pan.y) / dt;

    const speed = Math.hypot(vx, vy);

    if (speed < 0.05) return;

    const cap = 1.8;

    if (speed > cap) {
      vx = (vx / speed) * cap;
      vy = (vy / speed) * cap;
    }

    let lastTime = now;

    const step = (time: number) => {
      const frameMs = Math.min(
        32,
        time - lastTime
      );

      lastTime = time;

      applyPan({
        x:
          panRef.current.x +
          vx * frameMs,

        y:
          panRef.current.y +
          vy * frameMs,
      });

      const decay = Math.pow(
        0.93,
        frameMs / 16.7
      );

      vx *= decay;
      vy *= decay;

      if (
        Math.hypot(vx, vy) > 0.02
      ) {
        raf.current =
          requestAnimationFrame(step);
      }
    };

    raf.current =
      requestAnimationFrame(step);
  };

  // ============================================================
  // POINTER HELPERS
  // ============================================================

  function trackPointer(
    e: React.PointerEvent
  ) {
    pointers.current.set(
      e.pointerId,
      {
        x: e.clientX,
        y: e.clientY,
      }
    );
  }

  function currentCentroid(): Pan {
    const points = [
      ...pointers.current.values(),
    ];

    return {
      x:
        points.reduce(
          (sum, point) =>
            sum + point.x,
          0
        ) / points.length,

      y:
        points.reduce(
          (sum, point) =>
            sum + point.y,
          0
        ) / points.length,
    };
  }

  // ============================================================
  // POINTER DOWN
  // ============================================================

  function onPointerDown(
    e: React.PointerEvent
  ) {
    stopInertia();

    trackPointer(e);

    stageRef.current?.setPointerCapture(
      e.pointerId
    );

    if (pointers.current.size === 1) {
      moved.current = false;

      gestureStart.current = {
        x: e.clientX,
        y: e.clientY,
        pan: panRef.current,
      };

      centroid.current = null;
    } else {
      gestureStart.current = null;
      centroid.current =
        currentCentroid();
    }

    samples.current = [
      {
        t: performance.now(),
        pan: panRef.current,
      },
    ];
  }

  // ============================================================
  // POINTER MOVE
  // ============================================================

  function onPointerMove(
    e: React.PointerEvent
  ) {
    if (
      !pointers.current.has(
        e.pointerId
      )
    ) {
      return;
    }

    trackPointer(e);

    // Multi-touch
    if (
      pointers.current.size >= 2 &&
      centroid.current
    ) {
      const next =
        currentCentroid();

      const dx =
        next.x -
        centroid.current.x;

      const dy =
        next.y -
        centroid.current.y;

      centroid.current = next;

      if (dx !== 0 || dy !== 0) {
        moved.current = true;
        setDragging(true);

        applyPan({
          x:
            panRef.current.x + dx,

          y:
            panRef.current.y + dy,
        });

        samples.current.push({
          t: performance.now(),
          pan: panRef.current,
        });

        if (
          samples.current.length > 8
        ) {
          samples.current.shift();
        }
      }

      return;
    }

    const gesture =
      gestureStart.current;

    if (!gesture) return;

    const dx =
      e.clientX - gesture.x;

    const dy =
      e.clientY - gesture.y;

    if (
      !moved.current &&
      Math.hypot(dx, dy) >
        DRAG_THRESHOLD_PX
    ) {
      moved.current = true;
      setDragging(true);
    }

    if (moved.current) {
      applyPan({
        x:
          gesture.pan.x + dx,

        y:
          gesture.pan.y + dy,
      });

      samples.current.push({
        t: performance.now(),
        pan: panRef.current,
      });

      if (
        samples.current.length > 8
      ) {
        samples.current.shift();
      }
    }
  }

  // ============================================================
  // POINTER RELEASE
  // ============================================================

  function onPointerRelease(
    e: React.PointerEvent
  ) {
    pointers.current.delete(
      e.pointerId
    );

    try {
      stageRef.current?.releasePointerCapture(
        e.pointerId
      );
    } catch {
      // Pointer capture may already be released.
    }

    if (
      pointers.current.size === 0
    ) {
      setDragging(false);
      centroid.current = null;

      if (
        moved.current &&
        e.type === "pointerup"
      ) {
        startInertia();
      }
    } else if (
      pointers.current.size === 1
    ) {
      const [only] = [
        ...pointers.current.values(),
      ];

      gestureStart.current = {
        x: only.x,
        y: only.y,
        pan: panRef.current,
      };

      centroid.current = null;

      samples.current = [
        {
          t: performance.now(),
          pan: panRef.current,
        },
      ];
    }
  }

  // ============================================================
  // CLICK
  // ============================================================

  function onClickCapture(
    e: React.MouseEvent
  ) {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ============================================================
  // KEYBOARD
  // ============================================================

  function onKeyDown(
    e: React.KeyboardEvent
  ) {
    const deltas: Record<
      string,
      Pan
    > = {
      ArrowLeft: {
        x: KEY_PAN_PX,
        y: 0,
      },

      ArrowRight: {
        x: -KEY_PAN_PX,
        y: 0,
      },

      ArrowUp: {
        x: 0,
        y: KEY_PAN_PX,
      },

      ArrowDown: {
        x: 0,
        y: -KEY_PAN_PX,
      },
    };

    const delta = deltas[e.key];

    if (!delta) return;

    e.preventDefault();

    stopInertia();

    applyPan({
      x:
        panRef.current.x +
        delta.x,

      y:
        panRef.current.y +
        delta.y,
    });
  }

  // ============================================================
  // FOCUS
  // ============================================================

  function onFocusCapture(
    e: React.FocusEvent
  ) {
    const element =
      e.target as HTMLElement;

    const stage =
      stageRef.current;

    if (
      !stage ||
      !element.getBoundingClientRect
    ) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    const stageRect =
      stage.getBoundingClientRect();

    let { x, y } =
      panRef.current;

    if (
      rect.left <
      stageRect.left +
        FOCUS_MARGIN_PX
    ) {
      x +=
        stageRect.left +
        FOCUS_MARGIN_PX -
        rect.left;
    }

    if (
      rect.right >
      stageRect.right -
        FOCUS_MARGIN_PX
    ) {
      x -=
        rect.right -
        (stageRect.right -
          FOCUS_MARGIN_PX);
    }

    if (
      rect.top <
      stageRect.top +
        FOCUS_MARGIN_PX
    ) {
      y +=
        stageRect.top +
        FOCUS_MARGIN_PX -
        rect.top;
    }

    if (
      rect.bottom >
      stageRect.bottom -
        FOCUS_MARGIN_PX
    ) {
      y -=
        rect.bottom -
        (stageRect.bottom -
          FOCUS_MARGIN_PX);
    }

    if (
      x !== panRef.current.x ||
      y !== panRef.current.y
    ) {
      applyPan({ x, y });
    }
  }

  // ============================================================
  // WHEEL
  // ============================================================

  useEffect(() => {
    const stage =
      stageRef.current;

    if (!stage) return;

    const onWheel = (
      e: WheelEvent
    ) => {
      e.preventDefault();

      stopInertia();

      const dx = e.shiftKey
        ? e.deltaY
        : e.deltaX;

      const dy = e.shiftKey
        ? 0
        : e.deltaY;

      applyPan({
        x:
          panRef.current.x - dx,

        y:
          panRef.current.y - dy,
      });
    };

    stage.addEventListener(
      "wheel",
      onWheel,
      { passive: false }
    );

    return () => {
      stage.removeEventListener(
        "wheel",
        onWheel
      );
    };
  }, []);

  // ============================================================
  // STAGE RESIZE
  // ============================================================

  useEffect(() => {
    const stage =
      stageRef.current;

    if (!stage) return;

    const update = () => {
      setStageSize({
        width: stage.clientWidth,
        height: stage.clientHeight,
      });

      applyPan(panRef.current);
    };

    const observer =
      new ResizeObserver(update);

    observer.observe(stage);

    update();

    return () =>
      observer.disconnect();
  }, []);

  // ============================================================
  // MINIMAP GEOMETRY
  // ============================================================

  const innerWidth =
    MINIMAP_WIDTH -
    MINIMAP_PADDING * 2;

  const innerHeight =
    MINIMAP_HEIGHT -
    MINIMAP_PADDING * 2;

  const boardRatio =
    board.width /
    board.height;

  const minimapRatio =
    innerWidth /
    innerHeight;

  let mapWidth = innerWidth;
  let mapHeight = innerHeight;

  if (
    boardRatio >
    minimapRatio
  ) {
    mapHeight =
      mapWidth /
      boardRatio;
  } else {
    mapWidth =
      mapHeight *
      boardRatio;
  }

  const mapOffsetX =
    (innerWidth -
      mapWidth) /
    2;

  const mapOffsetY =
    (innerHeight -
      mapHeight) /
    2;

  const scale =
    mapWidth /
    board.width;

  // ============================================================
  // CURRENT VIEWPORT
  // ============================================================

  const visibleBoardWidth =
    stageSize.width /
    scale;

  const visibleBoardHeight =
    stageSize.height /
    scale;

  const currentBoardX =
    -pan.x;

  const currentBoardY =
    -pan.y;

  const maxBoardX =
    Math.max(
      0,
      board.width -
        visibleBoardWidth
    );

  const maxBoardY =
    Math.max(
      0,
      board.height -
        visibleBoardHeight
    );

  const clampedBoardX =
    Math.max(
      0,
      Math.min(
        maxBoardX,
        currentBoardX
      )
    );

  const clampedBoardY =
    Math.max(
      0,
      Math.min(
        maxBoardY,
        currentBoardY
      )
    );

  const viewportWidth =
    Math.min(
      board.width,
      visibleBoardWidth
    ) * scale;

  const viewportHeight =
    Math.min(
      board.height,
      visibleBoardHeight
    ) * scale;

  const viewportLeft =
    mapOffsetX +
    clampedBoardX *
      scale;

  const viewportTop =
    mapOffsetY +
    clampedBoardY *
      scale;

  // ============================================================
  // MINIMAP NAVIGATION
  // ============================================================

  function handleMinimapPointerDown(
    e: React.PointerEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    const minimap =
      minimapRef.current;

    if (!minimap) return;

    const rect =
      minimap.getBoundingClientRect();

    const localX =
      e.clientX -
      rect.left -
      MINIMAP_PADDING -
      mapOffsetX;

    const localY =
      e.clientY -
      rect.top -
      MINIMAP_PADDING -
      mapOffsetY;

    const targetX =
      Math.max(
        0,
        Math.min(
          board.width,
          localX / scale
        )
      );

    const targetY =
      Math.max(
        0,
        Math.min(
          board.height,
          localY / scale
        )
      );

    applyPan({
      x:
        stageSize.width / 2 -
        targetX,

      y:
        stageSize.height / 2 -
        targetY,
    });
  }

  // ============================================================
  // RENDER
  // ============================================================

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
      {/* ======================================================
          MAIN MOVING BOARD
          ====================================================== */}

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

      {/* ======================================================
          FIXED MINIMAP / OVERVIEW
          
          This is a sibling of shelf-board.

          shelf-board moves.
          minimap does NOT move.

          Therefore it behaves like a HUD attached to the
          visible shelf panel.
          ====================================================== */}

      <div
        ref={minimapRef}
        className="
          absolute
          bottom-4
          right-4
          z-[100]
          h-[110px]
          w-[180px]
          overflow-hidden
          rounded-xl
          border
          border-white/90
          bg-white/80
          p-[6px]
          shadow-[0_6px_24px_rgba(0,0,0,0.16)]
          backdrop-blur-md
          touch-none
        "
        onPointerDown={
          handleMinimapPointerDown
        }
        onPointerMove={(e) =>
          e.stopPropagation()
        }
        onPointerUp={(e) =>
          e.stopPropagation()
        }
        onPointerCancel={(e) =>
          e.stopPropagation()
        }
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* ==================================================
            MINIATURE BOARD

            This is the actual {children}, scaled down.
            ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            overflow-hidden
            rounded-md
            bg-white
            ring-1
            ring-slate-300/80
          "
          style={{
            left:
              MINIMAP_PADDING +
              mapOffsetX,

            top:
              MINIMAP_PADDING +
              mapOffsetY,

            width: mapWidth,
            height: mapHeight,
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: board.width,
              height: board.height,

              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>

          {/* Slight wash so the minimap reads as an overview */}
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-white/10
            "
          />
        </div>

        {/* ==================================================
            CURRENT POSITION INDICATOR
            ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            rounded-[3px]
            border-2
            border-bimbi-pink
            bg-bimbi-pink/15
            shadow-[0_0_0_1px_rgba(255,255,255,0.95)]
          "
          style={{
            left:
              MINIMAP_PADDING +
              viewportLeft,

            top:
              MINIMAP_PADDING +
              viewportTop,

            width: Math.max(
              5,
              viewportWidth
            ),

            height: Math.max(
              5,
              viewportHeight
            ),
          }}
        />

        {/* ==================================================
            LABEL
            ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            bottom-1.5
            left-1.5
            rounded-full
            bg-white/90
            px-1.5
            py-0.5
            text-[7px]
            font-extrabold
            uppercase
            tracking-[0.12em]
            text-slate-500
            shadow-sm
          "
        >
          Overview
        </div>
      </div>
    </div>
  );
}