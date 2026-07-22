import { prisma } from "@/lib/prisma";
import { searchProductImages } from "@/lib/serper";
import { uploadImageBytes } from "@/lib/upload";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

// Auto-fetch a product photo: search Serper, download the first usable candidate,
// store it (R2 in prod), and attach it as the product's primary image.

const MIN_IMAGE_BYTES = 5_000; // skip blank/broken 1x1s and error pages

export type FillResult = "filled" | "no-result" | "error";

export async function fillImageForProduct(p: { id: string; name: string }): Promise<FillResult> {
  let candidates;
  try {
    candidates = await searchProductImages(p.name); // 1 Serper credit
  } catch {
    return "error";
  }

  for (const c of candidates) {
    try {
      const res = await fetch(c.imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10_000),
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
  remaining: number;
};

// Process up to `limit` products that currently have no images. Kept small and
// sequential so a single request stays within serverless time limits; the caller
// loops until `remaining` reaches 0.
export async function backfillMissingImages(limit: number): Promise<BackfillSummary> {
  const products = await prisma.product.findMany({
    where: { images: { none: {} } },
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
    else if (result === "no-result") noResult++;
    else failed++;
  }

  const remaining = await prisma.product.count({ where: { images: { none: {} } } });
  return { processed: products.length, filled, noResult, failed, remaining };
}
