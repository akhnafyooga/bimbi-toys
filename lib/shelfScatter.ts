// Deterministic scatter for the free-roam shelf board (see ShelfCanvas.tsx).
//
// Every card's position, pose, shadow persona and idle-bob timing is derived
// from a seeded PRNG keyed by the shelf id (cluster anchors by category
// name). Pure functions, no randomness sources — so the server render and
// the client hydration agree exactly, and a shelf keeps its spot on the
// board across visits. Board coordinates are plain pixels on the virtual
// plane; the canvas stage translates the whole plane to pan.

export type ShadowPersona = {
  /** resting box-shadow (CSS value, injected as --shadow-rest) */
  rest: string;
  /** hover box-shadow — bigger, softer, further (injected as --shadow-hover) */
  hover: string;
};

export type ScatterCard = {
  /** slot top-left on the virtual plane, px */
  x: number;
  y: number;
  /** card width, px (height is content-driven) */
  width: number;
  /** scattered pose */
  rotate: number;
  scale: number;
  /** per-corner blob radii [tl, tr, br, bl], px */
  radii: [number, number, number, number];
  /** stacking order within the board */
  zIndex: number;
  /** idle bob timing (see .shelf-float in globals.css) */
  bobDuration: number;
  bobDelay: number;
  bobTilt: number;
  /** entrance stagger, ms */
  enterDelay: number;
} & ShadowPersona;

export type ScatterGroup = {
  /** stable key for the cluster anchor seed — the category name */
  key: string;
  items: { id: string }[];
};

export type ShelfBoard = {
  width: number;
  height: number;
  cards: Record<string, ScatterCard>;
};

/* Board rhythm. Cells are generous so jitter never stacks cards on top of
   each other; clusters get 3 slots across, wrapping to a new band of the
   plane after three clusters — the "loose category neighbourhoods" look. */
const CARD_W = 272;
const EST_CARD_H = 380;
const CELL_W = 340;
const CELL_H = 420;
const COLS = 3;
const CLUSTERS_PER_ROW = 3;
const CLUSTER_GAP_X = 100;
const CLUSTER_GAP_Y = 110;
const BOARD_PAD = 100;

/** FNV-1a — short, stable, good enough dispersion for ids/codes. */
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, fast, well-distributed; returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Low-alpha brand tints so shadows read as colour, not dirt. */
const TINTS: [number, number, number][] = [
  [0, 30, 96], // deep navy (bimbi-grape)
  [0, 113, 220], // brand blue
  [255, 194, 32], // spark yellow
  [42, 135, 3], // mint
];

/**
 * A card's shadow personality. The light is fixed at the top-left, so the
 * hard offset flips with the card's tilt — randomness that still feels
 * physical. Three personas mixed across the board:
 *   sticker — hard offset, like paper glued slightly proud of the board
 *   paper   — one soft diffuse tinted layer
 *   stacked — hard + soft = deep layered paper
 * Hover always grows, softens and drifts the shadow further out: the card
 * is being picked up off the board.
 */
function shadowPersona(rand: () => number, rotate: number): ShadowPersona {
  const [r, g, b] = TINTS[Math.floor(rand() * TINTS.length)];
  const dir = rotate >= 0 ? 1 : -1;
  const kind = Math.floor(rand() * 3);

  if (kind === 0) {
    const ox = (3 + rand() * 3) * dir;
    const oy = 4 + rand() * 3;
    return {
      rest: `${ox.toFixed(1)}px ${oy.toFixed(1)}px 0 rgba(${r}, ${g}, ${b}, 0.2)`,
      hover: `${(ox * 2).toFixed(1)}px ${(oy * 2).toFixed(1)}px 16px rgba(${r}, ${g}, ${b}, 0.26)`,
    };
  }

  if (kind === 1) {
    return {
      rest: `0 10px 22px rgba(${r}, ${g}, ${b}, 0.16)`,
      hover: `0 24px 44px rgba(${r}, ${g}, ${b}, 0.24)`,
    };
  }

  const ox = (2 + rand() * 2) * dir;
  const oy = 3 + rand() * 2;
  return {
    rest: `${ox.toFixed(1)}px ${oy.toFixed(1)}px 0 rgba(${r}, ${g}, ${b}, 0.18), 0 12px 26px rgba(${r}, ${g}, ${b}, 0.13)`,
    hover: `${(ox * 2.2).toFixed(1)}px ${(oy * 2.2).toFixed(1)}px 2px rgba(${r}, ${g}, ${b}, 0.2), 0 26px 48px rgba(${r}, ${g}, ${b}, 0.2)`,
  };
}

/**
 * Scatter the clustered shelves onto a virtual board. Groups keep their
 * given order (the admin's category ordering); each becomes a jittered
 * neighbourhood of cards. Returns the plane size plus per-card geometry.
 */
export function layoutShelfBoard(groups: ScatterGroup[]): ShelfBoard {
  const cards: Record<string, ScatterCard> = {};

  let bandY = BOARD_PAD;
  let nextX = BOARD_PAD;
  let bandHeight = 0;
  let maxX = BOARD_PAD;
  let maxY = BOARD_PAD;

  groups.forEach((group, gi) => {
    // Wrap to a new band of the plane after CLUSTERS_PER_ROW neighbourhoods.
    if (gi > 0 && gi % CLUSTERS_PER_ROW === 0) {
      bandY += bandHeight + CLUSTER_GAP_Y;
      nextX = BOARD_PAD;
      bandHeight = 0;
    }

    // Cluster anchor jitter is keyed by the category, so a category keeps
    // its neighbourhood's drift even as shelves come and go.
    const clusterRand = mulberry32(hashSeed(`cluster:${group.key}`));
    const anchorX = nextX + clusterRand() * 44;
    const anchorY = bandY + clusterRand() * 44;

    group.items.forEach((item, ii) => {
      const rand = mulberry32(hashSeed(item.id));
      const col = ii % COLS;
      const row = Math.floor(ii / COLS);

      const jitterX = (rand() - 0.5) * 52;
      const jitterY = (rand() - 0.5) * 48;
      const rotate = (rand() * 2 - 1) * 6.5;
      const scale = +(0.94 + rand() * 0.1).toFixed(3);
      const radii = [0, 0, 0, 0].map(() => Math.round(10 + rand() * 12)) as [
        number,
        number,
        number,
        number,
      ];

      // The persona call consumes PRNG draws in a fixed order — keep every
      // rand() call in this function sequential and unconditional.
      const persona = shadowPersona(rand, rotate);
      const bobDuration = +(7 + rand() * 5).toFixed(2);
      const bobDelay = +(-rand() * 10).toFixed(2);
      const bobTilt = +((rand() * 2 - 1) * 1.2).toFixed(2);
      const enterDelay = Math.round(gi * 130 + row * 90 + col * 60);

      const x = anchorX + col * CELL_W + jitterX;
      const y = anchorY + row * CELL_H + jitterY;

      cards[item.id] = {
        x: Math.round(x),
        y: Math.round(y),
        width: CARD_W,
        rotate: +rotate.toFixed(2),
        scale,
        radii,
        zIndex: gi * 100 + ii,
        bobDuration,
        bobDelay,
        bobTilt,
        enterDelay,
        ...persona,
      };

      maxX = Math.max(maxX, x + CARD_W);
      maxY = Math.max(maxY, y + EST_CARD_H);
    });

    const rows = Math.ceil(group.items.length / COLS);
    bandHeight = Math.max(bandHeight, rows * CELL_H);
    maxX = Math.max(maxX, anchorX + COLS * CELL_W);
    nextX += COLS * CELL_W + CLUSTER_GAP_X;
  });

  return {
    width: Math.round(maxX + BOARD_PAD),
    height: Math.round(maxY + BOARD_PAD),
    cards,
  };
}
