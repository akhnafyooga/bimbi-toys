// Shared logic for the "Lihat Ada Apa di Toko" shelf system — used by the
// storefront /store pages, the product-detail shelf list, and the admin panel.
// Shelves no longer list their products to customers: they show a photo, a
// description, and one manually curated price range (Shelf.priceMin/max).

// Price buckets for the browsing-page filter (?harga=...). A shelf matches a
// bucket when its manual price range overlaps it.
export const PRICE_BUCKETS = [
  { key: "lt25", label: "Di bawah Rp25.000", min: 0, max: 25_000 },
  { key: "25-50", label: "Rp25.000 – Rp50.000", min: 25_000, max: 50_000 },
  { key: "50-100", label: "Rp50.000 – Rp100.000", min: 50_000, max: 100_000 },
  { key: "gt100", label: "Di atas Rp100.000", min: 100_000, max: Number.MAX_SAFE_INTEGER },
] as const;

export type PriceBucketKey = (typeof PRICE_BUCKETS)[number]["key"];

export function isPriceBucketKey(value: string | undefined): value is PriceBucketKey {
  return !!value && PRICE_BUCKETS.some((b) => b.key === value);
}

export function priceBucket(key: PriceBucketKey) {
  return PRICE_BUCKETS.find((b) => b.key === key)!;
}

// Does a shelf's manual [min, max] range overlap the bucket's range?
export function shelfRangeInBucket(min: number, max: number, bucket: PriceBucketKey) {
  const { min: bMin, max: bMax } = priceBucket(bucket);
  return min <= bMax && max >= bMin;
}

// ---- Price range display ---------------------------------------------------

import { formatIDR } from "@/lib/format";

// "Rp25.000" when the range is a single price, "Rp25.000 – Rp75.000" otherwise.
export function formatShelfRange(min: number, max: number): string {
  return min === max ? formatIDR(min) : `${formatIDR(min)} – ${formatIDR(max)}`;
}
