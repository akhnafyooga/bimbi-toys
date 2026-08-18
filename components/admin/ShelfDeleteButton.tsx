"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";

export default function ShelfDeleteButton({
  shelfId,
  shelfName,
  shelfCode,
}: {
  shelfId: string;
  shelfName: string;
  shelfCode: string;
}) {
  return (
    <ConfirmButton
      confirmMessage={`Yakin mau hapus rak "${shelfName}" (${shelfCode})? Produk di dalamnya tidak ikut terhapus — hanya lepas dari rak ini.`}
      onConfirm={async () => {
        const res = await fetch(`/api/admin/shelves/${shelfId}`, { method: "DELETE" });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error ?? "Gagal menghapus rak." };
      }}
    >
      Hapus
    </ConfirmButton>
  );
}
