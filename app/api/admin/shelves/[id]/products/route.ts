import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateProductShelfList, type ProductShelfListInput } from "@/lib/shelfValidation";

// Replace the full product list of a shelf in one PUT. The array order is the
// display order — position is written from the index.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const shelf = await prisma.shelf.findUnique({ where: { id } });
  if (!shelf) return NextResponse.json({ error: "Rak tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as ProductShelfListInput;
  const { items, error: listError } = validateProductShelfList(body);
  if (!items) return NextResponse.json({ error: listError }, { status: 400 });

  if (items.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true },
    });
    const known = new Set(products.map((p) => p.id));
    if (known.size !== items.length) {
      return NextResponse.json(
        { error: "Ada produk yang tidak dikenal. Muat ulang halaman lalu coba lagi." },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    prisma.productShelf.deleteMany({ where: { shelfId: id } }),
    prisma.productShelf.createMany({
      data: items.map((item, index) => ({ ...item, shelfId: id, position: index })),
    }),
  ]);

  return NextResponse.json({ ok: true, count: items.length });
}
