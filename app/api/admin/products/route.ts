import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureUniqueSlug } from "@/lib/slug";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { validateProductInput, type ProductInput } from "@/lib/productValidation";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const categoryId = searchParams.get("categoryId") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, images: { orderBy: { position: "asc" as const }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, pageSize: PRODUCTS_PER_PAGE });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

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
  const slug = await ensureUniqueSlug(requestedSlug || name, (s) =>
    prisma.product.findUnique({ where: { slug: s } }).then((p) => !!p)
  );

  const product = await prisma.product.create({
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

  return NextResponse.json({ product });
}
