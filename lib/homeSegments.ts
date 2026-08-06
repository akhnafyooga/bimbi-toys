import type { Prisma } from "@prisma/client";

// Home-page merchandising groups. These are presentation-only: nothing in the
// database knows about "laki" or "perempuan", so each group is expressed as a
// Prisma filter over the categories and product names we already have. That
// keeps routing, the catalog filters and the admin panel untouched.

export type SegmentKey = "laki" | "perempuan";

type Segment = {
  key: SegmentKey;
  title: string;
  blurb: string;
  /** Category slugs that belong wholesale to this group. */
  categories: string[];
  /** Name keywords that pull matching items out of mixed categories. */
  keywords: string[];
  /** Band background + heading colour for this segment's row. */
  band: string;
  headingClass: string;
};

export const SEGMENTS: Segment[] = [
  {
    key: "laki",
    title: "Untuk Si Kecil Laki-Laki",
    blurb: "Mobil-mobilan, senjata mainan, robot, bola & balok susun",
    categories: ["mobil-kendaraan", "diecast-rc", "mainan-bayi"],
    keywords: [
      "MOBIL", "TRUK", "MOTOR", "PISTOL", "PEDANG", "SENAPAN", "ROBOT", "TAMIYA", "DINO",
      // absorbed from the former "Bayi & Balita" group — building / active play
      "BOLA", "TUMPUK", "BALOK",
    ],
    band: "bg-sky-100",
    headingClass: "text-sky-900",
  },
  {
    key: "perempuan",
    title: "Untuk Si Kecil Perempuan",
    blurb: "Boneka, mainan masak, puzzle & mainan bayi",
    categories: ["boneka", "mainan-bayi"],
    keywords: [
      "BONEKA", "MASAK", "DAPUR", "SALON", "PRINCESS", "SQUISHI", "SLIME", "TAS",
      // absorbed from the former "Bayi & Balita" group — soft / sensory play
      "PUZZLE", "GIGITAN", "KERINCING", "CICIT", "RATTLE",
    ],
    band: "bg-pink-100",
    headingClass: "text-pink-900",
  },
];

export const SEGMENT_BY_KEY = Object.fromEntries(SEGMENTS.map((s) => [s.key, s])) as Record<
  SegmentKey,
  Segment
>;

export function isSegmentKey(v: string | undefined): v is SegmentKey {
  return v === "laki" || v === "perempuan" || v === "bayi";
}

/** Prisma `where` for one segment: its categories OR any of its keywords. */
export function segmentWhere(key: SegmentKey): Prisma.ProductWhereInput {
  const s = SEGMENT_BY_KEY[key];
  return {
    OR: [
      { category: { slug: { in: s.categories } } },
      ...s.keywords.map((k) => ({
        name: { contains: k, mode: "insensitive" as const },
      })),
    ],
  };
}

// "Yang Kamu Cari" tiles. Placeholder artwork (emoji) on purpose, but every
// tile routes somewhere real so the page is usable before art exists.
export type QuickTile = {
  label: string;
  emoji: string;
  href: string;
  tone: string;
  /** Drop a real 600x600 photo at this path to replace the placeholder. */
  image: string;
};

export const QUICK_TILES: QuickTile[] = [
  { label: "Mobil-mobilan", image: "/brand/tiles/mobil-mobilan.png", emoji: "🚗", href: "/?category=mobil-kendaraan#katalog", tone: "bg-sky-100" },
  { label: "Senjata Mainan", image: "/brand/tiles/senjata-mainan.png", emoji: "🔫", href: "/search?q=pistol", tone: "bg-orange-100" },
  { label: "Boneka", image: "/brand/tiles/boneka.png", emoji: "🧸", href: "/?category=boneka#katalog", tone: "bg-pink-100" },
  { label: "Mainan Masak", image: "/brand/tiles/mainan-masak.png", emoji: "🍳", href: "/search?q=masak", tone: "bg-rose-100" },
  { label: "Balok & Puzzle", image: "/brand/tiles/balok-puzzle.png", emoji: "🧩", href: "/?category=mainan-edukasi-kreatif#katalog", tone: "bg-violet-100" },
  { label: "Outdoor", image: "/brand/tiles/outdoor.png", emoji: "⚽", href: "/?category=outdoor-olahraga#katalog", tone: "bg-emerald-100" },
  { label: "Alat Tulis", image: "/brand/tiles/alat-tulis.png", emoji: "✏️", href: "/?category=alat-tulis#katalog", tone: "bg-lime-100" },
];
