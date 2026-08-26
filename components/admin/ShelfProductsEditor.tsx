"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIDR } from "@/lib/format";
import { formatShelfRange } from "@/lib/shelf";

export type AssignedProduct = { productId: string; name: string; price: number };

type SearchHit = {
  id: string;
  name: string;
  displayName: string | null;
  price: number;
};

// Editor for a shelf's customer-facing price range (the shelf page no longer
// lists products — visitors ask via WhatsApp) plus the internal product
// assignment used for bookkeeping. Everything is written in one PUT, like
// StoreStockEditor.
export default function ShelfProductsEditor({
  shelfId,
  initialItems,
  initialPriceMin,
  initialPriceMax,
}: {
  shelfId: string;
  initialItems: AssignedProduct[];
  initialPriceMin: number | null;
  initialPriceMax: number | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AssignedProduct[]>(initialItems);
  const [priceMin, setPriceMin] = useState(initialPriceMin !== null ? String(initialPriceMin) : "");
  const [priceMax, setPriceMax] = useState(initialPriceMax !== null ? String(initialPriceMax) : "");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  const assignedIds = new Set(items.map((i) => i.productId));

  // Client mirror of validateShelfPriceRange — the server re-checks anyway.
  function rangeError(): string | null {
    const hasMin = priceMin.trim() !== "";
    const hasMax = priceMax.trim() !== "";
    if (!hasMin && !hasMax) return null;
    if (!hasMin || !hasMax) return "Isi kedua batas harga (termurah dan termahal), atau kosongkan keduanya.";
    const min = Number(priceMin);
    const max = Number(priceMax);
    if (!Number.isInteger(min) || min < 0 || !Number.isInteger(max) || max < 0)
      return "Harga harus angka bulat 0 atau lebih (dalam rupiah).";
    if (min > max) return "Harga termurah tidak boleh lebih besar dari harga termahal.";
    return null;
  }

  const rangeIssue = rangeError();
  const previewMin = Number(priceMin);
  const previewMax = Number(priceMax);
  const showPreview =
    !rangeIssue && priceMin.trim() !== "" && priceMax.trim() !== "";

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
    if (rangeError()) {
      setBanner({ type: "error", message: rangeError()! });
      return;
    }
    setPending(true);
    const res = await fetch(`/api/admin/shelves/${shelfId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: items.map((i) => ({ productId: i.productId })),
        priceMin: priceMin.trim() === "" ? null : Number(priceMin),
        priceMax: priceMax.trim() === "" ? null : Number(priceMax),
      }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan rak. Coba lagi ya." });
      return;
    }
    setDirty(false);
    setBanner({
      type: "success",
      message: showPreview ? `✅ Rentang harga ${formatShelfRange(previewMin, previewMax)} tersimpan` : "✅ Perubahan rak tersimpan",
    });
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bimbi-sky";

  return (
    <div className="space-y-8">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Customer-facing price range — the shelf page shows this instead of a
          product list; details go through the WhatsApp flow. */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Rentang Harga (tampil di halaman rak)</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Isi harga termurah dan termahal mainan di rak ini. Pembeli hanya melihat rentang ini — detail produk
            ditanyakan lewat WhatsApp.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`price-min-${shelfId}`} className="block text-xs font-bold text-slate-500 mb-1">
              Harga Termurah
            </label>
            <input
              id={`price-min-${shelfId}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMin}
              onChange={(e) => {
                setPriceMin(e.target.value);
                setDirty(true);
              }}
              placeholder="25000"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`price-max-${shelfId}`} className="block text-xs font-bold text-slate-500 mb-1">
              Harga Termahal
            </label>
            <input
              id={`price-max-${shelfId}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value);
                setDirty(true);
              }}
              placeholder="75000"
              className={inputClass}
            />
          </div>
        </div>
        {rangeIssue ? (
          <p className="text-xs font-semibold text-bimbi-pink-dark">{rangeIssue}</p>
        ) : showPreview ? (
          <p className="text-xs text-slate-500">
            Tampil sebagai:{" "}
            <span className="font-extrabold text-bimbi-ink tabular-nums">{formatShelfRange(previewMin, previewMax)}</span>
          </p>
        ) : (
          <p className="text-xs text-slate-400">Kosongkan keduanya jika tidak ingin menampilkan harga.</p>
        )}
      </section>

      {/* Internal product assignment — not shown to customers */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Produk di Rak Ini (catatan internal)</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Tidak ditampilkan ke pembeli — hanya untuk pencatatan stok toko.
          </p>
        </div>

        {/* Search existing products */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk untuk ditambahkan ke rak (ketik minimal 2 huruf)..."
            className={inputClass}
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
      </section>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !!rangeIssue}
          className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-md transition-colors cursor-pointer"
        >
          {pending ? "Menyimpan..." : "Simpan Rak"}
        </button>
        {dirty && <span className="ml-2 text-xs font-semibold text-amber-600">Ada perubahan belum disimpan.</span>}
      </div>
    </div>
  );
}
