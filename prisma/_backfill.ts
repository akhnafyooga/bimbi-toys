import { prisma } from "../lib/prisma";
import { fillImageForProduct } from "../lib/productImages";

// One-off image backfill: fetch a photo for each product that has none, ONCE
// (no retry loop, so no-result products don't re-spend Serper credits).
// Usage: tsx --env-file=.env prisma/_backfill.ts [maxCount]
async function main() {
  const max = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 0);
  const products = await prisma.product.findMany({
    where: { images: { none: {} } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    ...(max > 0 ? { take: max } : {}),
  });
  console.log(`Backfilling ${products.length} products...`);
  let filled = 0, noResult = 0, error = 0;
  for (const [i, p] of products.entries()) {
    const r = await fillImageForProduct(p);
    if (r === "filled") filled++;
    else if (r === "no-result") noResult++;
    else error++;
    if ((i + 1) % 10 === 0 || i === products.length - 1)
      console.log(`  ${i + 1}/${products.length}  filled=${filled} noResult=${noResult} error=${error}`);
  }
  console.log(`DONE. filled=${filled} noResult=${noResult} error=${error}`);
}
main().finally(() => prisma.$disconnect());
