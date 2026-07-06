import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureUniqueSlug } from "@/lib/slug";
import { validateCategoryInput, type CategoryInput } from "@/lib/categoryValidation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ category });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as CategoryInput;
  const { name, emoji, errors } = validateCategoryInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const nameOwner = await prisma.category.findUnique({ where: { name } });
  if (nameOwner && nameOwner.id !== id) {
    return NextResponse.json(
      { error: "Nama kategori ini sudah ada.", fields: { name: "Sudah ada kategori dengan nama ini." } },
      { status: 409 }
    );
  }

  const requestedSlug = String(body.slug ?? "").trim();
  const slug =
    requestedSlug === existing.slug
      ? existing.slug
      : await ensureUniqueSlug(requestedSlug || name, async (s) => {
          if (s === existing.slug) return false;
          const found = await prisma.category.findUnique({ where: { slug: s } });
          return !!found;
        });

  const category = await prisma.category.update({ where: { id }, data: { name, slug, emoji: emoji || null } });

  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      {
        error: `Kategori ini masih dipakai oleh ${productCount} produk. Pindahkan produknya ke kategori lain dulu sebelum menghapus.`,
      },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
