"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIDR } from "@/lib/format";

export type AssignedProduct = { productId: string; name: string; price: number };

type SearchHit = {
  id: string;
  name: string;
  displayName: string | null;
  price: number;
};

// Search+assign UI for a shelf's products. The assigned list is edited locally
// (add / remove / reorder) and written in one PUT, like StoreStockEditor.
export default function ShelfProductsEditor({
  shelfId,
  initialItems,
}: {
  shelfId: string;
  initialItems: AssignedProduct[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<AssignedProduct[]>(initialItems);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  const assignedIds = new Set(items.map((i) => i.productId));

  // Debounced product search against the existing admin products API. All
  // state updates happen inside the timeout/async callbacks, never
  // synchronously in the effect body.
  useEffect(() => {
    const q = search.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setHits([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { products?: SearchHit[] };
        setHits((data.products ?? []).slice(0, 8));
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  function addProduct(hit: SearchHit) {
    if (assignedIds.has(hit.id)) return;
    setItems((prev) => [...prev, { productId: hit.id, name: hit.displayName ?? hit.name, price: hit.price }]);
    setDirty(true);
  }

  function removeProduct(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
    setDirty(true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setDirty(true);
  }

  async function handleSave() {
    setBanner(null);
    setPending(true);
    const res = await fetch(`/api/admin/shelves/${shelfId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: items.map((i) => ({ productId: i.productId })) }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan produk rak. Coba lagi ya." });
      return;
    }
    setDirty(false);
    setBanner({ type: "success", message: `✅ ${items.length} produk tersimpan di rak ini` });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Search existing products */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk untuk ditambahkan ke rak (ketik minimal 2 huruf)..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky"
        />
        {search.trim().length >= 2 && (
          <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-card divide-y divide-slate-100">
            {searching && <p className="px-4 py-3 text-sm text-slate-400">Mencari...</p>}
            {!searching && hits.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Tidak ada produk yang cocok.</p>
            )}
            {!searching &&
              hits.map((hit) => (
                <div key={hit.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{hit.displayName ?? hit.name}</p>
                    <p className="text-xs text-slate-400">{formatIDR(hit.price)}</p>
                  </div>
                  {assignedIds.has(hit.id) ? (
                    <span className="text-xs font-semibold text-slate-400 shrink-0">Sudah di rak</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addProduct(hit)}
                      className="text-sm font-bold text-bimbi-mint hover:underline shrink-0 cursor-pointer"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Assigned products, ordered */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Belum ada produk di rak ini. Cari produk di atas lalu klik &quot;+ Tambah&quot;.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, i) => (
              <div key={item.productId} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-300 font-bold w-5 shrink-0">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{formatIDR(item.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm cursor-pointer"
                    title="Naikkan urutan"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm cursor-pointer"
                    title="Turunkan urutan"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProduct(item.productId)}
                    className="text-bimbi-pink-dark hover:underline text-sm font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
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
        {pending ? "Menyimpan..." : "Simpan Produk Rak"}
      </button>
      {dirty && <span className="ml-2 text-xs font-semibold text-amber-600">Ada perubahan belum disimpan.</span>}
    </div>
  );
}
