import StoreForm from "@/components/admin/StoreForm";

export default function NewStorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Tambah Toko Baru</h1>
        <p className="text-slate-500 text-sm mt-1">Isi info toko di bawah ini, lalu klik Simpan.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <StoreForm />
      </div>
    </div>
  );
}
