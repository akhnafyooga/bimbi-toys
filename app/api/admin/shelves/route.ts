import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateShelfInput, type ShelfInput } from "@/lib/shelfValidation";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId")?.trim() || "";

  const shelves = await prisma.shelf.findMany({
    where: storeId ? { storeId } : {},
    include: {
      store: { select: { id: true, name: true, city: true } },
      category: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ store: { name: "asc" } }, { position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ shelves });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

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
  if (codeOwner) {
    return NextResponse.json(
      { error: `Kode rak ${code} sudah dipakai di toko ini.`, fields: { code: "Kode rak sudah ada di toko ini." } },
      { status: 409 }
    );
  }

  const shelf = await prisma.shelf.create({
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
