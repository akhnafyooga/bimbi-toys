"use client";

import { useMemo, useState } from "react";

type StockItem = { productId: string; name: string; quantity: number };

export default function StoreStockEditor({ storeId, items }: { storeId: string; items: StockItem[] }) {
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.productId, String(i.quantity)]))
  );
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  async function handleSave() {
    setBanner(null);

    const invalid = Object.values(quantities).some((v) => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0));
    if (invalid) {
      setBanner({ type: "error", message: "Ada isian stok yang tidak valid. Stok tidak boleh negatif." });
      return;
    }

    setPending(true);
    const res = await fetch(`/api/admin/stores/${storeId}/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantities: Object.entries(quantities).map(([productId, quantity]) => ({
          productId,
          quantity: quantity === "" ? 0 : Number(quantity),
        })),
      }),
    });
    setPending(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan stok. Coba lagi ya." });
      return;
    }
    setBanner({ type: "success", message: " Stok berhasil disimpan" });
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari nama produk..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">Tidak ada produk yang cocok.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtered.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={quantities[item.productId] ?? "0"}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                  className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-md transition-colors cursor-pointer"
      >
        {pending ? "Menyimpan..." : "Simpan Semua"}
      </button>
    </div>
  );
}
