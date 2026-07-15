"use client";

import { useRouter } from "next/navigation";

type Category = { id: string; slug: string; name: string; emoji?: string | null };

// Catalog filter as a dropdown — stays tidy no matter how many categories exist.
export default function CategoryDropdown({
  categories,
  current,
}: {
  categories: Category[];
  current?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={current ?? ""}
      onChange={(e) => router.push(e.target.value ? `/?category=${e.target.value}` : "/")}
      className="rounded-full border-2 border-bimbi-sky/30 bg-white px-4 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-bimbi-sky focus:border-bimbi-sky transition-colors"
    >
      <option value="">Semua Kategori</option>
      {categories.map((c) => (
        <option key={c.id} value={c.slug}>
          {c.emoji ? `${c.emoji} ` : ""}{c.name}
        </option>
      ))}
    </select>
  );
}
