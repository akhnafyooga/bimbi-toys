import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const store = await prisma.storeLocation.findUnique({ where: { id } });
  if (!store) return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { stockByStore: { where: { storeId: id } } },
  });

  const items = products.map((p) => ({
    productId: p.id,
    name: p.name,
    quantity: p.stockByStore[0]?.quantity ?? 0,
  }));

  return NextResponse.json({ store, items });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const store = await prisma.storeLocation.findUnique({ where: { id } });
  if (!store) return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as { quantities?: { productId: string; quantity: number | string }[] };
  const quantities = Array.isArray(body.quantities) ? body.quantities : [];

  for (const q of quantities) {
    const qty = Number(q.quantity);
    if (typeof q.productId !== "string" || !Number.isFinite(qty) || qty < 0) {
      return NextResponse.json({ error: "Ada isian stok yang tidak valid. Stok tidak boleh negatif." }, { status: 400 });
    }
  }

  await prisma.$transaction(
    quantities.map((q) =>
      prisma.storeStock.upsert({
        where: { storeId_productId: { storeId: id, productId: q.productId } },
        create: { storeId: id, productId: q.productId, quantity: Number(q.quantity) },
        update: { quantity: Number(q.quantity) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
