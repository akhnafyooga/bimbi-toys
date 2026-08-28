"use client";

import { useRouter } from "next/navigation";
import FancySelect from "@/components/FancySelect";

type Category = { id: string; slug: string; name: string; emoji?: string | null };

// Catalog filter as a dropdown — stays tidy no matter how many categories exist.
// FancySelect carries the shop's look; the native OS <select> popup never could.
export default function CategoryDropdown({
  categories,
  current,
}: {
  categories: Category[];
  current?: string;
}) {
  const router = useRouter();

  return (
    <FancySelect
      value={current ?? ""}
      onChange={(v) => router.push(v ? `/?category=${v}` : "/")}
      ariaLabel="Filter kategori"
      options={[
        { value: "", label: "Semua Kategori" },
        ...categories.map((c) => ({ value: c.slug, label: c.name })),
      ]}
      triggerClassName="rounded-full border-2 border-bimbi-sky/30 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-bimbi-sky transition-colors"
    />
  );
}
