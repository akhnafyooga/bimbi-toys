// One-off: backfills Shelf.priceMin/priceMax from the prices of the products
// currently assigned to each shelf, so live shelves keep a sensible range
// before admins curate it by hand.
//
//   npx tsx prisma/backfill-shelf-prices.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shelves = await prisma.shelf.findMany({
    include: { products: { include: { product: { select: { price: true } } } } },
  });

  let filled = 0;
  for (const shelf of shelves) {
    if (shelf.products.length === 0) continue;
    const prices = shelf.products.map((ps) => ps.product.price);
    await prisma.shelf.update({
      where: { id: shelf.id },
      data: { priceMin: Math.min(...prices), priceMax: Math.max(...prices) },
    });
    filled++;
  }
  console.log(`💰 Backfilled price range on ${filled}/${shelves.length} shelves.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
