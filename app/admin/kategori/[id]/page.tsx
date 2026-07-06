import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Edit Kategori</h1>
        <p className="text-slate-500 text-sm mt-1">{category.name}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <CategoryForm category={category} />
      </div>
    </div>
  );
}
