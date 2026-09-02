// Deterministic scatter for the free-roam shelf board.
//
// Categories remain visually grouped, but the overall layout is compact.
// The board dimensions are calculated from the actual card positions so
// shelves are never clipped by the canvas.
//
// Board coordinates are plain pixels on the virtual plane.
// ShelfCanvas translates the entire plane when panning.

export type ShadowPersona = {
  rest: string;
  hover: string;
};

export type ScatterCard = {
  x: number;
  y: number;
  width: number;

  rotate: number;
  scale: number;

  radii: [
    number,
    number,
    number,
    number
  ];

  zIndex: number;

  bobDuration: number;
  bobDelay: number;
  bobTilt: number;

  enterDelay: number;
} & ShadowPersona;

export type ScatterGroup = {
  key: string;

  items: {
    id: string;
  }[];
};

export type ShelfBoard = {
  width: number;
  height: number;

  cards: Record<
    string,
    ScatterCard
  >;
};

/* ============================================================
   BOARD CONFIG
   ============================================================ */

/*
 * Base card width.
 *
 * This should match the width used by ShelfCard.
 */
const CARD_W = 272;

/*
 * Approximate maximum visual card height, including the no-image frame and
 * the information panel below it.
 *
 * This is used ONLY for calculating board bounds.
 */
const EST_CARD_H = 600;

/*
 * Distance between shelves inside a category.
 *
 * Smaller = shelves closer together.
 */
const CELL_W = 300;
const CELL_H = 620;

/*
 * Maximum shelves in one category row.
 */
const COLS = 3;

/*
 * Space between category neighbourhoods.
 */
const CLUSTER_GAP_X = 35;
const CLUSTER_GAP_Y = 45;

/*
 * Outer board padding.
 */
const BOARD_PAD = 100;

/*
 * Small organic movement.
 */
const JITTER_X = 18;
const JITTER_Y = 18;

/*
 * Extra space around the calculated board bounds.
 *
 * This prevents rotated cards / shadows / animation from being
 * clipped against the virtual board edge.
 */
const VISUAL_PADDING = 80;

/* ============================================================
   SEEDED RANDOM
   ============================================================ */

function hashSeed(
  str: string
): number {
  let h =
    2166136261 >>> 0;

  for (
    let i = 0;
    i < str.length;
    i++
  ) {
    h ^= str.charCodeAt(i);

    h = Math.imul(
      h,
      16777619
    );
  }

  return h >>> 0;
}

function mulberry32(
  seed: number
): () => number {
  let a =
    seed >>> 0;

  return () => {
    a =
      (a +
        0x6d2b79f5) |
      0;

    let t =
      Math.imul(
        a ^
          (a >>> 15),
        1 | a
      );

    t =
      (t +
        Math.imul(
          t ^
            (t >>> 7),
          61 | t
        )) ^
      t;

    return (
      ((t ^
        (t >>> 14)) >>>
        0) /
      4294967296
    );
  };
}

/* ============================================================
   SHADOWS
   ============================================================ */

const TINTS: [
  number,
  number,
  number
][] = [
  [0, 30, 96],
  [0, 113, 220],
  [255, 194, 32],
  [42, 135, 3],
];

function shadowPersona(
  rand: () => number,
  rotate: number
): ShadowPersona {
  const [
    r,
    g,
    b,
  ] =
    TINTS[
      Math.floor(
        rand() *
          TINTS.length
      )
    ];

  const dir =
    rotate >= 0
      ? 1
      : -1;

  const kind =
    Math.floor(
      rand() * 3
    );

  if (
    kind === 0
  ) {
    const ox =
      (3 +
        rand() * 3) *
      dir;

    const oy =
      4 +
      rand() * 3;

    return {
      rest: `${ox.toFixed(
        1
      )}px ${oy.toFixed(
        1
      )}px 0 rgba(${r}, ${g}, ${b}, 0.2)`,

      hover: `${(
        ox * 2
      ).toFixed(
        1
      )}px ${(oy * 2).toFixed(
        1
      )}px 16px rgba(${r}, ${g}, ${b}, 0.26)`,
    };
  }

  if (
    kind === 1
  ) {
    return {
      rest: `0 10px 22px rgba(${r}, ${g}, ${b}, 0.16)`,

      hover: `0 24px 44px rgba(${r}, ${g}, ${b}, 0.24)`,
    };
  }

  const ox =
    (2 +
      rand() * 2) *
    dir;

  const oy =
    3 +
    rand() * 2;

  return {
    rest: `${ox.toFixed(
      1
    )}px ${oy.toFixed(
      1
    )}px 0 rgba(${r}, ${g}, ${b}, 0.18), 0 12px 26px rgba(${r}, ${g}, ${b}, 0.13)`,

    hover: `${(
      ox * 2.2
    ).toFixed(
      1
    )}px ${(oy * 2.2).toFixed(
      1
    )}px 2px rgba(${r}, ${g}, ${b}, 0.2), 0 26px 48px rgba(${r}, ${g}, ${b}, 0.2)`,
  };
}

/* ============================================================
   BOARD LAYOUT
   ============================================================ */

export function layoutShelfBoard(
  groups: ScatterGroup[]
): ShelfBoard {
  const cards: Record<
    string,
    ScatterCard
  > = {};

  /*
   * Current category position.
   */
  let clusterX =
    BOARD_PAD;

  let clusterY =
    BOARD_PAD;

  /*
   * Height of the tallest category
   * in the current category row.
   */
  let currentRowHeight = 0;

  /*
   * Track actual card bounds.
   */
  let minX =
    BOARD_PAD;

  let minY =
    BOARD_PAD;

  let maxX =
    BOARD_PAD;

  let maxY =
    BOARD_PAD;

  /*
   * Count categories in the current row.
   *
   * We use actual width instead of forcing every category
   * into a fixed three-column area.
   */
  let categoriesInRow = 0;

  groups.forEach(
    (group, gi) => {
      if (
        group.items.length ===
        0
      ) {
        return;
      }

      /* ========================================================
         CATEGORY SIZE
         ======================================================== */

      const itemCount =
        group.items.length;

      const columns =
        Math.min(
          COLS,
          itemCount
        );

      const rows =
        Math.ceil(
          itemCount /
            COLS
        );

      const clusterWidth =
        columns *
          CELL_W;

      const clusterHeight =
        rows *
          CELL_H;

      /* ========================================================
         CATEGORY SEED
         ======================================================== */

      const clusterRand =
        mulberry32(
          hashSeed(
            `cluster:${group.key}`
          )
        );

      /*
       * Tiny category drift.
       */
      const anchorJitterX =
        (clusterRand() -
          0.5) *
        16;

      const anchorJitterY =
        (clusterRand() -
          0.5) *
        16;

      const anchorX =
        clusterX +
        anchorJitterX;

      const anchorY =
        clusterY +
        anchorJitterY;

      /* ========================================================
         SHELVES
         ======================================================== */

      group.items.forEach(
        (
          item,
          ii
        ) => {
          const rand =
            mulberry32(
              hashSeed(
                item.id
              )
            );

          const col =
            ii %
            COLS;

          const row =
            Math.floor(
              ii /
                COLS
            );

          /*
           * Position jitter.
           */
          const jitterX =
            (rand() -
              0.5) *
            JITTER_X;

          const jitterY =
            (rand() -
              0.5) *
            JITTER_Y;

          /*
           * Small rotation.
           */
          const rotate =
            (rand() *
              2 -
              1) *
            5.5;

          /*
           * Keep scale very close to 1.
           */
          const scale =
            +(
              0.97 +
              rand() *
                0.06
            ).toFixed(3);

          /*
           * Organic corners.
           */
          const radii =
            [
              0,
              0,
              0,
              0,
            ].map(
              () =>
                Math.round(
                  10 +
                    rand() *
                      12
                )
            ) as [
              number,
              number,
              number,
              number
            ];

          /*
           * Shadow.
           */
          const persona =
            shadowPersona(
              rand,
              rotate
            );

          /*
           * Idle movement.
           */
          const bobDuration =
            +(
              7 +
              rand() *
                5
            ).toFixed(2);

          const bobDelay =
            +(
              -rand() *
              10
            ).toFixed(2);

          const bobTilt =
            +(
              (rand() *
                2 -
                1) *
              1.2
            ).toFixed(2);

          /*
           * Entrance animation.
           */
          const enterDelay =
            Math.round(
              gi * 100 +
                row * 70 +
                col * 45
            );

          /*
           * Final position.
           */
          const x =
            anchorX +
            col *
              CELL_W +
            jitterX;

          const y =
            anchorY +
            row *
              CELL_H +
            jitterY;

          cards[
            item.id
          ] = {
            x: Math.round(
              x
            ),

            y: Math.round(
              y
            ),

            width:
              CARD_W,

            rotate:
              +rotate.toFixed(
                2
              ),

            scale,

            radii,

            zIndex:
              gi *
                100 +
              ii,

            bobDuration,
            bobDelay,
            bobTilt,
            enterDelay,

            ...persona,
          };

          /* ======================================================
             ACTUAL VISUAL BOUNDS
             ====================================================== */

          /*
           * Account for scaling.
           */
          const visualWidth =
            CARD_W *
            scale;

          const visualHeight =
            EST_CARD_H *
            scale;

          /*
           * Rotation can make the bounding box slightly larger.
           *
           * For a rectangle:
           *
           * rotatedWidth =
           *   |w cos θ| + |h sin θ|
           *
           * rotatedHeight =
           *   |w sin θ| + |h cos θ|
           */
          const radians =
            (rotate *
              Math.PI) /
            180;

          const absCos =
            Math.abs(
              Math.cos(
                radians
              )
            );

          const absSin =
            Math.abs(
              Math.sin(
                radians
              )
            );

          const rotatedWidth =
            visualWidth *
              absCos +
            visualHeight *
              absSin;

          const rotatedHeight =
            visualWidth *
              absSin +
            visualHeight *
              absCos;

          /*
           * Position refers to the card's top-left.
           *
           * Rotation occurs around the card center,
           * so account for the rotated rectangle extending
           * beyond the original bounds.
           */
          const visualLeft =
            x -
            (rotatedWidth -
              visualWidth) /
              2;

          const visualTop =
            y -
            (rotatedHeight -
              visualHeight) /
              2;

          const visualRight =
            visualLeft +
            rotatedWidth;

          const visualBottom =
            visualTop +
            rotatedHeight;

          minX =
            Math.min(
              minX,
              visualLeft
            );

          minY =
            Math.min(
              minY,
              visualTop
            );

          maxX =
            Math.max(
              maxX,
              visualRight
            );

          maxY =
            Math.max(
              maxY,
              visualBottom
            );
        }
      );

      /* ========================================================
         CATEGORY BOUNDS
         ======================================================== */

      maxX =
        Math.max(
          maxX,
          anchorX +
            clusterWidth
        );

      maxY =
        Math.max(
          maxY,
          anchorY +
            clusterHeight
        );

      currentRowHeight =
        Math.max(
          currentRowHeight,
          clusterHeight
        );

      /* ========================================================
         NEXT CATEGORY
         ======================================================== */

      clusterX +=
        clusterWidth +
        CLUSTER_GAP_X;

      categoriesInRow++;

      /*
       * Wrap after four categories.
       *
       * This keeps the board reasonably wide without creating
       * giant empty areas.
       */
      if (
        categoriesInRow >=
        4
      ) {
        clusterX =
          BOARD_PAD;

        clusterY +=
          currentRowHeight +
          CLUSTER_GAP_Y;

        currentRowHeight = 0;
        categoriesInRow = 0;
      }
    }
  );

  /* ============================================================
     FINAL BOARD SIZE
     ============================================================ */

  /*
   * Normalize bounds if a category's jitter pushed something
   * slightly above the nominal padding.
   */
  const contentMinX =
    Math.min(
      BOARD_PAD,
      minX
    );

  const contentMinY =
    Math.min(
      BOARD_PAD,
      minY
    );

  /*
   * Add generous visual padding around the actual content.
   *
   * This is the important part that prevents the canvas from
   * clipping cards near the edge.
   */
  const width =
    Math.ceil(
      Math.max(
        maxX +
          VISUAL_PADDING,
        BOARD_PAD * 2 +
          CARD_W
      )
    );

  const height =
    Math.ceil(
      Math.max(
        maxY +
          VISUAL_PADDING,
        BOARD_PAD * 2 +
          EST_CARD_H
      )
    );

  /*
   * contentMinX/contentMinY are intentionally calculated above
   * so the board always has a safe origin.
   *
   * Cards themselves remain in the same coordinate system.
   */
  void contentMinX;
  void contentMinY;

  return {
    width,
    height,
    cards,
  };
} 