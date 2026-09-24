import type { Prisma } from "@prisma/client";

// Home-page merchandising groups. These are presentation-only: nothing in the
// database knows about "kecil" (nor about the old laki/perempuan split), so the
// group is expressed as a Prisma filter over the categories and product names
// we already have. That keeps routing, the catalog filters and the admin panel
// untouched.

export type SegmentKey = "kecil";

// Slugs that used to be their own segments. They are still produced by the
// "Cari Mainanmu?" picker and can live on in bookmarks / shared links, so each
// one resolves to the merged segment instead of silently filtering nothing
// (or, for "bayi", crashing on a missing SEGMENT_BY_KEY entry).
export type LegacySegmentKey = "laki" | "perempuan" | "bayi";

const LEGACY_ALIASES: Record<LegacySegmentKey, SegmentKey> = {
  laki: "kecil",
  perempuan: "kecil",
  bayi: "kecil",
};

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
    key: "kecil",
    title: "Untuk Si Kecil",
    blurb: "Mobil-mobilan, boneka, masak-masakan, robot, puzzle & mainan bayi",
    // Union of the two former gender rails (mainan-bayi appears in both, once).
    categories: ["mobil-kendaraan", "diecast-rc", "mainan-bayi", "boneka"],
    keywords: [
      // active / building play
      "MOBIL", "TRUK", "MOTOR", "PISTOL", "PEDANG", "SENAPAN", "ROBOT", "TAMIYA", "DINO",
      "BOLA", "TUMPUK", "BALOK",
      // soft / sensory / role play
      "BONEKA", "MASAK", "DAPUR", "SALON", "PRINCESS", "SQUISHI", "SLIME", "TAS",
      "PUZZLE", "GIGITAN", "KERINCING", "CICIT", "RATTLE",
    ],
    band: "bg-violet-100",
    headingClass: "text-violet-900",
  },
];

export const SEGMENT_BY_KEY = Object.fromEntries(SEGMENTS.map((s) => [s.key, s])) as Record<
  SegmentKey,
  Segment
>;

/** Resolve a `?segment=` value to a real segment key, or undefined if unknown. */
export function resolveSegmentKey(v: string | undefined): SegmentKey | undefined {
  if (!v) return undefined;
  if (v in SEGMENT_BY_KEY) return v as SegmentKey;
  return LEGACY_ALIASES[v as LegacySegmentKey];
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
