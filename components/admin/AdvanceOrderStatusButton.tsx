"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";

export default function AdvanceOrderStatusButton({
  orderId,
  nextStatus,
  label,
}: {
  orderId: string;
  nextStatus: string;
  label: string;
}) {
  return (
    <ConfirmButton
      confirmMessage={`${label}?`}
      pendingLabel="Menyimpan..."
      successMessage="✅ Status pesanan berhasil diperbarui"
      className="bg-bimbi-pink hover:bg-bimbi-pink-dark text-white font-bold text-sm px-5 py-2.5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      onConfirm={async () => {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error ?? "Gagal memperbarui status pesanan." };
      }}
    >
      {label}
    </ConfirmButton>
  );
}
