"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField, { inputClass } from "@/components/admin/FormField";
import ImageUploader, { ProductImageItem } from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/slug";

type Category = { id: string; name: string; emoji: string | null };

type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  minAge: number | null;
  categoryId: string;
  featured: boolean;
  images: { url: string; alt: string | null }[];
};

export default function ProductForm({ categories, product }: { categories: Category[]; product?: ProductData }) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showSlug, setShowSlug] = useState(false);
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice ? String(product.compareAtPrice) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [images, setImages] = useState<ProductImageItem[]>(
    product?.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })) ?? []
  );

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

    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "Nama produk belum diisi.";
    if (!description.trim()) fieldErrors.description = "Deskripsi belum diisi.";
    if (!categoryId) fieldErrors.categoryId = "Pilih kategori dulu.";
    const priceNum = Number(price);
    if (!price || !Number.isFinite(priceNum) || priceNum <= 0) fieldErrors.price = "Harga harus lebih dari 0.";
    const stockNum = Number(stock);
    if (stock === "" || !Number.isFinite(stockNum) || stockNum < 0) fieldErrors.stock = "Stok tidak boleh negatif.";
    if (compareAtPrice) {
      const cmp = Number(compareAtPrice);
      if (!Number.isFinite(cmp) || cmp <= priceNum) {
        fieldErrors.compareAtPrice = "Harga coret harus lebih besar dari harga jual.";
      }
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
      slug: slug.trim(),
      description: description.trim(),
      price: priceNum,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      stock: stockNum,
      categoryId,
      featured,
      images,
    };

    const res = await fetch(isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrors(data.fields ?? {});
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan produk. Coba lagi ya." });
      return;
    }

    setBanner({ type: "success", message: "✅ Produk berhasil disimpan" });
    setTimeout(() => router.push("/admin/produk"), 700);
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

      <FormField label="Nama Produk" error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Contoh: Boneka Beruang Coklat"
          className={inputClass}
        />
      </FormField>

      <div>
        <button
          type="button"
          onClick={() => setShowSlug((v) => !v)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {showSlug ? "▾" : "▸"} Pengaturan lanjutan (URL produk)
        </button>
        {showSlug && (
          <div className="mt-2">
            <FormField label="URL Produk (slug)" hint="Otomatis dibuat dari nama produk. Ubah hanya jika perlu.">
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

      <FormField label="Deskripsi" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ceritakan produk ini — bahan, ukuran, keunggulannya..."
          className={inputClass}
        />
      </FormField>

      <FormField label="Foto Produk" hint="Foto pertama akan jadi foto utama yang tampil di toko." optional>
        <ImageUploader images={images} onChange={setImages} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Harga" hint="Angka saja, tanpa titik atau Rp. Contoh: 150000" error={errors.price}>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150000"
            className={inputClass}
          />
        </FormField>

        <FormField
          label="Harga Coret"
          hint="Harga sebelum diskon, kosongkan jika tidak ada."
          optional
          error={errors.compareAtPrice}
        >
          <input
            type="number"
            inputMode="numeric"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            placeholder="200000"
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Stok" hint="Jumlah barang yang tersedia." error={errors.stock}>
        <input
          type="number"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
      </FormField>

      <FormField label="Kategori" error={errors.categoryId}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          {categories.length === 0 && <option value="">Belum ada kategori</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="w-4 h-4 accent-bimbi-sky cursor-pointer"
        />
        <span className="text-sm font-semibold text-slate-700">⭐ Tampilkan sebagai produk unggulan</span>
      </label>

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
          onClick={() => router.push("/admin/produk")}
          className="text-slate-500 hover:text-slate-700 font-semibold text-sm cursor-pointer"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
