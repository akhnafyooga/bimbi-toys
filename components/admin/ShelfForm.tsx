"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormField, { inputClass } from "@/components/admin/FormField";

export type ShelfFormValues = {
  id: string;
  name: string;
  code: string;
  storeId: string;
  categoryId: string;
  description: string | null;
  image: string | null;
  position: number;
  active: boolean;
};

export default function ShelfForm({
  stores,
  categories,
  defaultStoreId,
  shelf,
}: {
  stores: { id: string; name: string; city: string }[];
  categories: { id: string; name: string }[];
  defaultStoreId?: string;
  shelf?: ShelfFormValues;
}) {
  const router = useRouter();
  const isEdit = !!shelf;

  const [name, setName] = useState(shelf?.name ?? "");
  const [code, setCode] = useState(shelf?.code ?? "");
  const [storeId, setStoreId] = useState(shelf?.storeId ?? defaultStoreId ?? "");
  const [categoryId, setCategoryId] = useState(shelf?.categoryId ?? "");
  const [description, setDescription] = useState(shelf?.description ?? "");
  const [image, setImage] = useState(shelf?.image ?? "");
  const [position, setPosition] = useState(shelf ? String(shelf.position) : "0");
  const [active, setActive] = useState(shelf?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "shelves");
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setUploading(false);
    if (!res.ok || !data.url) {
      setUploadError(data.error ?? "Gagal mengunggah foto rak.");
      return;
    }
    setImage(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "Nama rak belum diisi.";
    if (!code.trim()) fieldErrors.code = "Kode rak belum diisi.";
    if (!storeId) fieldErrors.storeId = "Pilih toko untuk rak ini.";
    if (!categoryId) fieldErrors.categoryId = "Pilih kategori rak.";
    if (!Number.isInteger(Number(position)) || Number(position) < 0) {
      fieldErrors.position = "Urutan tampil harus angka bulat 0 atau lebih.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setBanner({ type: "error", message: "Ada isian yang belum benar. Periksa lagi ya." });
      return;
    }

    setErrors({});
    setPending(true);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      storeId,
      categoryId,
      description: description.trim(),
      image: image.trim(),
      position: Number(position),
      active,
    };
    const res = await fetch(isEdit ? `/api/admin/shelves/${shelf!.id}` : "/api/admin/shelves", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrors(data.fields ?? {});
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan rak. Coba lagi ya." });
      return;
    }

    setBanner({ type: "success", message: "✅ Rak berhasil disimpan" });
    if (!isEdit) {
      // After creating, jump straight to the new shelf so products can be
      // assigned immediately — that's the natural next step.
      setTimeout(() => router.push(`/admin/rak/${data.shelf.id}`), 600);
    }
  }

  // Without a shelf category there is nothing to submit against — guide the
  // admin there instead of showing a broken form.
  if (categories.length === 0) {
    return (
      <div className="rounded-lg bg-bimbi-sun/60 border border-bimbi-sky/20 px-4 py-6 text-sm text-slate-600">
        <p className="font-bold text-slate-800">Belum ada kategori rak.</p>
        <p className="mt-1">Kategori rak dipakai untuk mengelompokkan rak di halaman pelanggan, misalnya &quot;Mainan Bayi&quot; atau &quot;Edukasi&quot;.</p>
        <Link
          href="/admin/rak/kategori"
          className="mt-3 inline-block bg-bimbi-sky hover:bg-blue-800 text-white font-bold text-sm px-4 py-2 rounded-md transition-colors"
        >
          + Buat Kategori Rak Dulu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      <FormField label="Nama Rak" error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Mainan Edukasi"
          className={inputClass}
        />
      </FormField>

      <FormField label="Kode Rak" hint="Kode yang tertera di rak fisik, unik per toko." error={errors.code}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Contoh: EDU-04"
          className={inputClass}
        />
      </FormField>

      <FormField label="Toko" error={errors.storeId}>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={inputClass}>
          <option value="">— Pilih toko —</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.city})
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Kategori Rak" hint="Kelompok tampilan di halaman pelanggan." error={errors.categoryId}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          <option value="">— Pilih kategori —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Deskripsi" optional error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Contoh: Puzzle, balok susun, dan kartu belajar untuk usia 2–5 tahun."
          className={inputClass}
        />
      </FormField>

      <FormField label="Foto Rak" optional hint="Foto fisik rak di toko. JPG/PNG/WEBP, maksimal 5MB.">
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-40 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            {image ? (
              <Image src={image} alt="Foto rak" fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-300">Belum ada foto</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm font-semibold text-bimbi-sky hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? "Mengunggah..." : image ? "Ganti foto rak" : "Pilih foto rak"}
            </button>
            {image && (
              <button
                type="button"
                onClick={() => setImage("")}
                className="text-left text-sm font-semibold text-bimbi-pink-dark hover:underline cursor-pointer"
              >
                Hapus foto
              </button>
            )}
            {uploadError && <span className="text-xs font-semibold text-bimbi-pink-dark">⚠️ {uploadError}</span>}
          </div>
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Urutan Tampil" hint="Angka kecil tampil duluan." error={errors.position}>
          <input
            type="number"
            min={0}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <label className="flex items-end gap-2 pb-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-bimbi-sky"
          />
          Tampilkan di halaman pelanggan
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-2.5 rounded-md transition-colors cursor-pointer"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/rak")}
          className="text-slate-500 hover:text-slate-700 font-semibold text-sm cursor-pointer"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
