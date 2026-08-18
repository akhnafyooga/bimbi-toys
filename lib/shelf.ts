import { LOW_STOCK_THRESHOLD } from "@/lib/constants";

// Shared logic for the "Lihat Ada Apa di Toko" shelf system — used by the
// storefront /store pages, the product-detail shelf list, and the admin panel.

// Price buckets for the browsing-page filter (?harga=...). A shelf matches a
// bucket when ANY of its products falls inside the range — not when the
// shelf's overall min–max range fits inside it.
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

export function priceInRange(price: number, bucket: PriceBucketKey) {
  const { min, max } = priceBucket(bucket);
  return price >= min && price <= max;
}

// ---- Derived shelf stats ---------------------------------------------------

export type ShelfStats = { count: number; min: number; max: number };

export function shelfPriceRange(prices: number[]): ShelfStats | null {
  if (prices.length === 0) return null;
  return { count: prices.length, min: Math.min(...prices), max: Math.max(...prices) };
}

// ---- Availability ----------------------------------------------------------

export type Availability = "in" | "low" | "out";

export function availabilityFor(qty: number): Availability {
  if (qty <= 0) return "out";
  if (qty <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in: "Tersedia",
  low: "Stok terbatas",
  out: "Habis",
};

// Per-store quantity for a shelf row: fall back to the product's global stock
// when the store has no StoreStock row for it (stock tracking is optional).
export function storeQty(globalStock: number, storeStock?: number | null) {
  return storeStock ?? globalStock;
}
