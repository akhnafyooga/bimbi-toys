"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";

export default function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  return (
    <ConfirmButton
      confirmMessage={`Yakin mau hapus "${productName}"? Tindakan ini tidak bisa dibatalkan.`}
      onConfirm={async () => {
        const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error ?? "Gagal menghapus produk." };
      }}
    >
      Hapus
    </ConfirmButton>
  );
}
