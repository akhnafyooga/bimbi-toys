// Deterministic "random each day" selection, balanced across categories.
//
// The same day always yields the same picks (stable while customers browse),
// but the set rotates when the date changes. Uses a seeded PRNG so nothing
// depends on the database's ordering.

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Today's date in WIB (UTC+7) as YYYY-MM-DD — the daily seed. Using WIB means
// the picks roll over at local midnight, not 07:00.
export function jakartaDayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Pick `count` items spread as evenly as possible across categories, seeded by
// `dayKey`. Round-robins one item per category at a time, so categories stay
// balanced; if a category runs dry the rest keep filling until `count` is met.
export function pickDailyBalanced<T extends { categoryId: string }>(
  items: T[],
  count: number,
  dayKey: string
): T[] {
  const rand = mulberry32(hashString(dayKey));

  const groups = new Map<string, T[]>();
  for (const it of items) {
    const g = groups.get(it.categoryId);
    if (g) g.push(it);
    else groups.set(it.categoryId, [it]);
  }

  // Shuffle category order (fair rotation of which categories lead) and the
  // items within each category (which product represents it today).
  const buckets = seededShuffle([...groups.keys()], rand).map((id) =>
    seededShuffle(groups.get(id)!, rand)
  );

  const result: T[] = [];
  let i = 0;
  while (result.length < count && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[i % buckets.length];
    const next = bucket.shift();
    if (next) result.push(next);
    i++;
  }
  return result;
}
