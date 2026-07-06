"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";

export default function StoreDeleteButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  return (
    <ConfirmButton
      confirmMessage={`Yakin mau hapus toko "${storeName}"? Tindakan ini tidak bisa dibatalkan.`}
      onConfirm={async () => {
        const res = await fetch(`/api/admin/stores/${storeId}`, { method: "DELETE" });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error ?? "Gagal menghapus toko." };
      }}
    >
      Hapus
    </ConfirmButton>
  );
}
