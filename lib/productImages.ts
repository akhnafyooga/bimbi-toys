import { prisma } from "@/lib/prisma";
import { searchProductImages } from "@/lib/serper";
import { uploadImageBytes } from "@/lib/upload";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

// Auto-fetch a product photo: search Serper, download the first usable candidate,
// store it (R2 in prod), and attach it as the product's primary image.

const MIN_IMAGE_BYTES = 5_000; // skip blank/broken 1x1s and error pages

// Time budget so one product can't blow a serverless request's wall-clock limit
// (Vercel Hobby kills functions at 10s). Each candidate download is capped, and
// we stop trying candidates once the phase deadline passes — worst case stays
// well under 10s so the caller can safely run one product per request.
const DOWNLOAD_TIMEOUT_MS = 3_000; // per candidate
const DOWNLOAD_DEADLINE_MS = 7_000; // stop starting new candidates after this

export type FillResult = "filled" | "no-result" | "error";

export async function fillImageForProduct(p: { id: string; name: string }): Promise<FillResult> {
  let candidates;
  try {
    candidates = await searchProductImages(p.name); // 1 Serper credit
  } catch {
    return "error";
  }

  const started = Date.now();
  for (const c of candidates) {
    if (Date.now() - started > DOWNLOAD_DEADLINE_MS) break; // out of time budget
    try {
      const res = await fetch(c.imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!res.ok) continue;

      const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < MIN_IMAGE_BYTES || buffer.length > MAX_IMAGE_SIZE_BYTES) continue;

      const { url } = await uploadImageBytes(buffer, contentType);
      await prisma.productImage.create({
        data: { productId: p.id, url, alt: p.name, position: 0 },
      });
      return "filled";
    } catch {
      continue; // try the next candidate
    }
  }
  return "no-result";
}

export type BackfillSummary = {
  processed: number;
  filled: number;
  noResult: number;
  failed: number;
  /** Products never searched yet — this is what drives the client loop. */
  remaining: number;
  /** Products still without an image, including ones already searched in vain. */
  remainingNoImage: number;
};

// Process up to `limit` products that currently have no images. Kept small and
// sequential so a single request stays within serverless time limits; the caller
// loops until `remaining` reaches 0.
export async function backfillMissingImages(limit: number): Promise<BackfillSummary> {
  // Only products we have never searched for. Excluding imageSearchedAt is what
  // keeps a product that Serper cannot match from costing a credit on every run.
  const pending = { images: { none: {} }, imageSearchedAt: null } as const;

  const products = await prisma.product.findMany({
    where: pending,
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  let filled = 0;
  let noResult = 0;
  let failed = 0;
  for (const p of products) {
    const result = await fillImageForProduct(p);
    if (result === "filled") filled++;
    else if (result === "no-result") {
      noResult++;
      // The credit was spent and there is nothing to find — never ask again.
      await prisma.product.update({ where: { id: p.id }, data: { imageSearchedAt: new Date() } });
    } else {
      // A thrown search (network, rate limit, outage) usually costs no credit
      // and may succeed later, so this one stays pending on purpose.
      failed++;
    }
  }

  const [remaining, remainingNoImage] = await Promise.all([
    prisma.product.count({ where: pending }),
    prisma.product.count({ where: { images: { none: {} } } }),
  ]);
  return { processed: products.length, filled, noResult, failed, remaining, remainingNoImage };
}
