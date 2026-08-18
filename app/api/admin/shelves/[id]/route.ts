import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateShelfInput, type ShelfInput } from "@/lib/shelfValidation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: { store: true, category: true },
  });
  if (!shelf) return NextResponse.json({ error: "Rak tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ shelf });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.shelf.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rak tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as ShelfInput;
  const { name, code, storeId, categoryId, description, image, position, active, errors } =
    validateShelfInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const [store, category] = await Promise.all([
    prisma.storeLocation.findUnique({ where: { id: storeId } }),
    prisma.shelfCategory.findUnique({ where: { id: categoryId } }),
  ]);
  if (!store) {
    return NextResponse.json({ error: "Toko tidak ditemukan.", fields: { storeId: "Toko tidak valid." } }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json(
      { error: "Kategori rak tidak ditemukan.", fields: { categoryId: "Kategori rak tidak valid." } },
      { status: 400 }
    );
  }

  const codeOwner = await prisma.shelf.findUnique({ where: { storeId_code: { storeId, code } } });
  if (codeOwner && codeOwner.id !== id) {
    return NextResponse.json(
      { error: `Kode rak ${code} sudah dipakai di toko ini.`, fields: { code: "Kode rak sudah ada di toko ini." } },
      { status: 409 }
    );
  }

  const shelf = await prisma.shelf.update({
    where: { id },
    data: {
      name,
      code,
      storeId,
      categoryId,
      description: description || null,
      image: image || null,
      position,
      active,
    },
  });

  return NextResponse.json({ shelf });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.shelf.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rak tidak ditemukan." }, { status: 404 });

  // ProductShelf rows cascade on delete — removing the shelf only unassigns
  // its products; products, stock, and orders are untouched.
  await prisma.shelf.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
