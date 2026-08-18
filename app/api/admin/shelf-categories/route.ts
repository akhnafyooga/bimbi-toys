import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureUniqueSlug } from "@/lib/slug";
import { validateShelfCategoryInput, type ShelfCategoryInput } from "@/lib/shelfValidation";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.shelfCategory.findMany({
    include: { _count: { select: { shelves: true } } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as ShelfCategoryInput;
  const { name, position, errors } = validateShelfCategoryInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const nameOwner = await prisma.shelfCategory.findUnique({ where: { name } });
  if (nameOwner) {
    return NextResponse.json(
      { error: "Nama kategori rak ini sudah ada.", fields: { name: "Sudah ada kategori rak dengan nama ini." } },
      { status: 409 }
    );
  }

  const slug = await ensureUniqueSlug(name, (s) =>
    prisma.shelfCategory.findUnique({ where: { slug: s } }).then((c) => !!c)
  );

  const category = await prisma.shelfCategory.create({ data: { name, slug, position } });
  return NextResponse.json({ category });
}
