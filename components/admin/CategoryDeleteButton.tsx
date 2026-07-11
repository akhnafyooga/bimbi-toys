"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";

export default function CategoryDeleteButton({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  return (
    <ConfirmButton
      confirmMessage={`Yakin mau hapus kategori "${categoryName}"? Tindakan ini tidak bisa dibatalkan.`}
      onConfirm={async () => {
        const res = await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error ?? "Gagal menghapus kategori." };
      }}
    >
      Hapus
    </ConfirmButton>
  );
}
