import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureUniqueSlug } from "@/lib/slug";
import { validateCategoryInput, type CategoryInput } from "@/lib/categoryValidation";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as CategoryInput;
  const { name, emoji, errors } = validateCategoryInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const existingName = await prisma.category.findUnique({ where: { name } });
  if (existingName) {
    return NextResponse.json(
      { error: "Nama kategori ini sudah ada.", fields: { name: "Sudah ada kategori dengan nama ini." } },
      { status: 409 }
    );
  }

  const requestedSlug = String(body.slug ?? "").trim();
  const slug = await ensureUniqueSlug(requestedSlug || name, (s) =>
    prisma.category.findUnique({ where: { slug: s } }).then((c) => !!c)
  );

  const category = await prisma.category.create({ data: { name, slug, emoji: emoji || null } });

  return NextResponse.json({ category });
}
