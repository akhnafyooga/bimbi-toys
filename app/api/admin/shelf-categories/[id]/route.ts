import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateShelfCategoryInput, type ShelfCategoryInput } from "@/lib/shelfValidation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.shelfCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kategori rak tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as ShelfCategoryInput;
  const { name, position, errors } = validateShelfCategoryInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const nameOwner = await prisma.shelfCategory.findUnique({ where: { name } });
  if (nameOwner && nameOwner.id !== id) {
    return NextResponse.json(
      { error: "Nama kategori rak ini sudah ada.", fields: { name: "Sudah ada kategori rak dengan nama ini." } },
      { status: 409 }
    );
  }

  const category = await prisma.shelfCategory.update({ where: { id }, data: { name, position } });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const shelfCount = await prisma.shelf.count({ where: { categoryId: id } });
  if (shelfCount > 0) {
    return NextResponse.json(
      {
        error: `Kategori rak ini masih dipakai oleh ${shelfCount} rak. Pindahkan raknya ke kategori lain dulu sebelum menghapus.`,
      },
      { status: 409 }
    );
  }

  await prisma.shelfCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
