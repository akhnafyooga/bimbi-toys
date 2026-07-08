import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Edit Produk</h1>
        <p className="text-slate-500 text-sm mt-1">{product.name}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5 sm:p-6">
        <ProductForm categories={categories} product={product} />
      </div>
    </div>
  );
}
