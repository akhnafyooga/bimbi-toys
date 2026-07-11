import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureUniqueSlug } from "@/lib/slug";
import { validateProductInput, type ProductInput } from "@/lib/productValidation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } }, category: true },
  });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ product });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as ProductInput;
  const { name, description, price, stock, categoryId, compareAtPrice, minAge, featured, images, errors } =
    validateProductInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json(
      { error: "Kategori tidak ditemukan.", fields: { categoryId: "Kategori tidak valid." } },
      { status: 400 }
    );
  }

  const requestedSlug = String(body.slug ?? "").trim();
  const slug =
    requestedSlug === existing.slug
      ? existing.slug
      : await ensureUniqueSlug(requestedSlug || name, async (s) => {
          if (s === existing.slug) return false;
          const found = await prisma.product.findUnique({ where: { slug: s } });
          return !!found;
        });

  const product = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } });
    return tx.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        stock,
        categoryId,
        compareAtPrice,
        minAge,
        featured,
        slug,
        images: { create: images.map((img, i) => ({ url: img.url, alt: img.alt || null, position: i })) },
      },
    });
  });

  return NextResponse.json({ product });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Produk ini tidak bisa dihapus karena sudah pernah dipesan pelanggan. Kosongkan stoknya saja sebagai gantinya.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
