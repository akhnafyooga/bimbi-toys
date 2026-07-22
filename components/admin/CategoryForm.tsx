"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField, { inputClass } from "@/components/admin/FormField";
import { slugify } from "@/lib/slug";

type CategoryData = { id: string; name: string; slug: string; emoji: string | null };

export default function CategoryForm({ category }: { category?: CategoryData }) {
  const router = useRouter();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showSlug, setShowSlug] = useState(false);
  const [emoji, setEmoji] = useState(category?.emoji ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    if (!name.trim()) {
      setErrors({ name: "Nama kategori belum diisi." });
      setBanner({ type: "error", message: "Ada isian yang belum benar. Periksa lagi ya." });
      return;
    }

    setErrors({});
    setPending(true);

    const payload = { name: name.trim(), slug: slug.trim(), emoji: emoji.trim() };
    const res = await fetch(isEdit ? `/api/admin/categories/${category!.id}` : "/api/admin/categories", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrors(data.fields ?? {});
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan kategori. Coba lagi ya." });
      return;
    }

    setBanner({ type: "success", message: " Kategori berhasil disimpan" });
    setTimeout(() => router.push("/admin/kategori"), 700);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      <FormField label="Nama Kategori" error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Contoh: Action Figure"
          className={inputClass}
        />
      </FormField>

      <FormField label="Emoji" hint="Ikon kecil yang tampil di samping nama kategori." optional>
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder=""
          maxLength={4}
          className={`${inputClass} w-24 text-center text-lg`}
        />
      </FormField>

      <div>
        <button
          type="button"
          onClick={() => setShowSlug((v) => !v)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {showSlug ? "▾" : "▸"} Pengaturan lanjutan (URL kategori)
        </button>
        {showSlug && (
          <div className="mt-2">
            <FormField label="URL Kategori (slug)" hint="Otomatis dibuat dari nama kategori. Ubah hanya jika perlu.">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                className={inputClass}
              />
            </FormField>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-md transition-colors cursor-pointer"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/kategori")}
          className="text-slate-500 hover:text-slate-700 font-semibold text-sm cursor-pointer"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
