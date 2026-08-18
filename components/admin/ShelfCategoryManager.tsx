"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/admin/FormField";
import ConfirmButton from "@/components/admin/ConfirmButton";

export type ShelfCategoryRow = {
  id: string;
  name: string;
  position: number;
  shelfCount: number;
};

// Inline manager for shelf categories: create, rename, reorder, delete —
// small enough that a single list+form beats separate pages.
export default function ShelfCategoryManager({ categories }: { categories: ShelfCategoryRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setBanner(null);
    const res = await fetch("/api/admin/shelf-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        position: categories.length ? Math.max(...categories.map((c) => c.position)) + 1 : 0,
      }),
    });
    setCreating(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanner({ type: "error", message: data.error ?? "Gagal menambah kategori rak." });
      return;
    }
    setNewName("");
    setBanner({ type: "success", message: "✅ Kategori rak berhasil ditambahkan" });
    router.refresh();
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setBanner(null);
    const res = await fetch(`/api/admin/shelf-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), position: Number(editPosition) || 0 }),
    });
    setSavingEdit(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanner({ type: "error", message: data.error ?? "Gagal menyimpan kategori rak." });
      return;
    }
    setEditingId(null);
    setBanner({ type: "success", message: "✅ Kategori rak berhasil disimpan" });
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-xl">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-bimbi-pink/10 text-bimbi-pink-dark"
          }`}
        >
          {banner.message}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama kategori baru, misalnya: Mainan Bayi"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2 rounded-md transition-colors shrink-0 cursor-pointer"
        >
          {creating ? "Menyimpan..." : "+ Tambah"}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Belum ada kategori rak. Tambahkan satu di atas, misalnya &quot;Mainan Bayi&quot;.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((c) => (
              <div key={c.id} className="px-4 py-3">
                {editingId === c.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${inputClass} flex-1 min-w-40`}
                    />
                    <input
                      type="number"
                      min={0}
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      title="Urutan tampil"
                      className={`${inputClass} w-20`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={savingEdit || !editName.trim()}
                      className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-sm px-3 py-2 rounded-md transition-colors cursor-pointer"
                    >
                      {savingEdit ? "..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-slate-500 hover:text-slate-700 font-semibold text-sm cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Urutan {c.position} · {c.shelfCount} rak
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                          setEditPosition(String(c.position));
                        }}
                        className="text-bimbi-sky hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      {c.shelfCount === 0 && (
                        <ConfirmButton
                          confirmMessage={`Yakin mau hapus kategori rak "${c.name}"?`}
                          onConfirm={async () => {
                            const res = await fetch(`/api/admin/shelf-categories/${c.id}`, { method: "DELETE" });
                            if (res.ok) return { ok: true };
                            const data = await res.json().catch(() => ({}));
                            return { ok: false, error: data.error ?? "Gagal menghapus kategori rak." };
                          }}
                        >
                          Hapus
                        </ConfirmButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
