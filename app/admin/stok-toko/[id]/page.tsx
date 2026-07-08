import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoreForm from "@/components/admin/StoreForm";

export default async function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await prisma.storeLocation.findUnique({ where: { id } });
  if (!store) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Edit Toko</h1>
        <p className="text-slate-500 text-sm mt-1">{store.name}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5 sm:p-6">
        <StoreForm store={store} />
      </div>
    </div>
  );
}
