import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateStoreInput, type StoreInput } from "@/lib/storeValidation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const store = await prisma.storeLocation.findUnique({ where: { id } });
  if (!store) return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ store });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.storeLocation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as StoreInput;
  const { name, city, address, phone, lat, lng, errors } = validateStoreInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const store = await prisma.storeLocation.update({
    where: { id },
    data: { name, city, address, phone: phone || null, lat, lng },
  });

  return NextResponse.json({ store });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const orderCount = await prisma.order.count({ where: { storeId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `Toko ini masih punya riwayat ${orderCount} pesanan dan tidak bisa dihapus.` },
      { status: 409 }
    );
  }

  await prisma.storeLocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
