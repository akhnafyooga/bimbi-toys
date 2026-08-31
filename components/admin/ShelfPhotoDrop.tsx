"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/admin/FormField";

/* ============================================================
   TYPES
   ============================================================ */

type Store = { id: string; name: string; city: string };
type Category = { id: string; name: string };

type UploadSlot = {
  id: string;
  /** file name shown during upload */
  fileName: string;
  progress: number;
  error?: string;
  /** populated once upload succeeds */
  url?: string;
};

type DraftShelf = {
  id: string;
  imageUrl: string;
  name: string;
  code: string;
  storeId: string;
  categoryId: string;
  /** field-level validation errors */
  errors: Record<string, string>;
  saving: boolean;
  saved: boolean;
};

/* ============================================================
   UPLOADER HELPER
   ============================================================ */

function uploadFile(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore parse failure — handled by status check below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve({ url: data.url });
      } else {
        reject(new Error(data.error ?? "Gagal mengunggah foto."));
      }
    };
    xhr.onerror = () =>
      reject(new Error("Gagal mengunggah foto. Periksa koneksi internet kamu."));
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "shelves");
    xhr.send(form);
  });
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ShelfPhotoDrop({
  stores,
  categories,
}: {
  stores: Store[];
  categories: Category[];
}) {
  const router = useRouter();

  const [dragOver, setDragOver] = useState(false);
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  const [drafts, setDrafts] = useState<DraftShelf[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ----------------------------------------------------------
     beforeunload guard
     ---------------------------------------------------------- */

  const hasPendingDrafts =
    drafts.some((d) => !d.saved) || slots.some((s) => !s.error && !s.url);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingDrafts) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasPendingDrafts]);

  /* ----------------------------------------------------------
     File handling
     ---------------------------------------------------------- */

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        const slotId = crypto.randomUUID();

        setSlots((prev) => [
          ...prev,
          { id: slotId, fileName: file.name, progress: 0 },
        ]);

        uploadFile(file, (pct) => {
          setSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, progress: pct } : s))
          );
        })
          .then(({ url }) => {
            // Remove the upload slot and promote to draft
            setSlots((prev) => prev.filter((s) => s.id !== slotId));

            const draftId = crypto.randomUUID();
            setDrafts((prev) => [
              ...prev,
              {
                id: draftId,
                imageUrl: url,
                name: "Rak Baru",
                code: "",
                storeId: stores.length === 1 ? stores[0].id : "",
                categoryId: categories.length === 1 ? categories[0].id : "",
                errors: {},
                saving: false,
                saved: false,
              },
            ]);
          })
          .catch((err: Error) => {
            setSlots((prev) =>
              prev.map((s) =>
                s.id === slotId ? { ...s, error: err.message } : s
              )
            );
          });
      });
    },
    [stores, categories]
  );

  /* ----------------------------------------------------------
     Draft field updater
     ---------------------------------------------------------- */

  function updateDraft(id: string, patch: Partial<DraftShelf>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  /* ----------------------------------------------------------
     Save draft → create shelf in DB
     ---------------------------------------------------------- */

  async function saveDraft(draft: DraftShelf) {
    const fieldErrors: Record<string, string> = {};
    if (!draft.name.trim()) fieldErrors.name = "Nama rak belum diisi.";
    if (!draft.code.trim()) fieldErrors.code = "Kode rak belum diisi.";
    if (!draft.storeId) fieldErrors.storeId = "Pilih toko.";
    if (!draft.categoryId) fieldErrors.categoryId = "Pilih kategori.";

    if (Object.keys(fieldErrors).length > 0) {
      updateDraft(draft.id, { errors: fieldErrors });
      return;
    }

    updateDraft(draft.id, { errors: {}, saving: true });

    const res = await fetch("/api/admin/shelves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        storeId: draft.storeId,
        categoryId: draft.categoryId,
        description: "",
        image: draft.imageUrl,
        position: 0,
        active: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      updateDraft(draft.id, {
        saving: false,
        errors: {
          ...(data.fields ?? {}),
          _banner: data.error ?? "Gagal menyimpan rak.",
        },
      });
      return;
    }

    updateDraft(draft.id, { saving: false, saved: true });
    // Remove the saved draft card after a brief success flash
    setTimeout(() => {
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      router.refresh();
    }, 900);
  }

  /* ----------------------------------------------------------
     Discard draft (no DB deletion — photo stays in storage)
     ---------------------------------------------------------- */

  function discardDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  /* ----------------------------------------------------------
     Nothing to show — render only the subtle drop hint
     ---------------------------------------------------------- */

  const isEmpty = slots.length === 0 && drafts.length === 0;

  /* ----------------------------------------------------------
     Drag event helpers (must not interfere with child elements)
     ---------------------------------------------------------- */

  const dragCounter = useRef(0);

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  /* ----------------------------------------------------------
     RENDER
     ---------------------------------------------------------- */

  return (
    <div className="space-y-3">
      {/* ── Drop zone ── */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Area unggah foto rak — seret dan lepas di sini atau klik untuk pilih"
        className={[
          "relative cursor-pointer select-none rounded-xl border-2 border-dashed px-6 py-5 text-center transition-all duration-150",
          dragOver
            ? "border-bimbi-sky bg-bimbi-sky/5 shadow-[0_0_0_4px_rgba(0,113,220,0.12)]"
            : "border-slate-300 hover:border-bimbi-sky/60 hover:bg-slate-50/60",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Icon */}
        <div
          className={[
            "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            dragOver
              ? "bg-bimbi-sky/15 text-bimbi-sky"
              : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p
          className={[
            "text-sm font-semibold transition-colors",
            dragOver ? "text-bimbi-sky" : "text-slate-600",
          ].join(" ")}
        >
          {dragOver
            ? "Lepaskan foto di sini…"
            : "Seret & lepas foto rak di sini, atau klik untuk pilih"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          JPG, PNG, atau WEBP — bisa banyak sekaligus — maks. 5 MB per foto
        </p>
      </div>

      {/* ── Upload progress slots ── */}
      {slots.length > 0 && (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              {/* spinning indicator or error icon */}
              {slot.error ? (
                <span className="shrink-0 text-base">⚠️</span>
              ) : (
                <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-bimbi-sky border-t-transparent" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">
                  {slot.fileName}
                </p>
                {slot.error ? (
                  <p className="mt-0.5 text-xs text-bimbi-pink-dark">
                    {slot.error}
                  </p>
                ) : (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-bimbi-sky transition-all duration-150"
                      style={{ width: `${slot.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {slot.error && (
                <button
                  type="button"
                  onClick={() =>
                    setSlots((prev) => prev.filter((s) => s.id !== slot.id))
                  }
                  className="shrink-0 text-xs text-slate-400 underline hover:text-slate-600 cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Draft shelf cards ── */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Foto terunggah — lengkapi detailnya lalu simpan
          </p>

          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              stores={stores}
              categories={categories}
              onUpdate={(patch) => updateDraft(draft.id, patch)}
              onSave={() => saveDraft(draft)}
              onDiscard={() => discardDraft(draft.id)}
            />
          ))}
        </div>
      )}

      {/* Faint helper line when nothing is pending */}
      {isEmpty && (
        <p className="text-center text-xs text-slate-300">
          Foto yang diunggah akan muncul di sini sebelum disimpan ke daftar rak.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   DRAFT CARD (sub-component)
   ============================================================ */

function DraftCard({
  draft,
  stores,
  categories,
  onUpdate,
  onSave,
  onDiscard,
}: {
  draft: DraftShelf;
  stores: Store[];
  categories: Category[];
  onUpdate: (patch: Partial<DraftShelf>) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (draft.saved) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
        <span className="text-base">✅</span>
        <span>
          <span className="font-bold">{draft.name}</span> berhasil disimpan!
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Thumbnail */}
        <div className="relative h-40 sm:h-auto sm:w-48 shrink-0 bg-slate-100">
          <Image
            src={draft.imageUrl}
            alt="Foto rak yang diunggah"
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover"
          />
          {/* Draft badge */}
          <span className="absolute left-2 top-2 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 shadow">
            Draf
          </span>
        </div>

        {/* Form */}
        <div className="flex-1 p-4 space-y-3">
          {/* Banner error */}
          {draft.errors._banner && (
            <div className="rounded-lg bg-bimbi-pink/10 px-3 py-2 text-xs font-semibold text-bimbi-pink-dark">
              ⚠️ {draft.errors._banner}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Rak <span className="text-bimbi-pink-dark">*</span>
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Contoh: Mainan Edukasi"
                className={[
                  inputClass,
                  draft.errors.name ? "border-bimbi-pink ring-1 ring-bimbi-pink" : "",
                ].join(" ")}
              />
              {draft.errors.name && (
                <p className="mt-0.5 text-xs text-bimbi-pink-dark">
                  {draft.errors.name}
                </p>
              )}
            </div>

            {/* Kode */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kode Rak <span className="text-bimbi-pink-dark">*</span>
              </label>
              <input
                type="text"
                value={draft.code}
                onChange={(e) => onUpdate({ code: e.target.value })}
                placeholder="Contoh: EDU-04"
                className={[
                  inputClass,
                  "uppercase",
                  draft.errors.code ? "border-bimbi-pink ring-1 ring-bimbi-pink" : "",
                ].join(" ")}
              />
              {draft.errors.code && (
                <p className="mt-0.5 text-xs text-bimbi-pink-dark">
                  {draft.errors.code}
                </p>
              )}
            </div>

            {/* Toko */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Toko <span className="text-bimbi-pink-dark">*</span>
              </label>
              <select
                value={draft.storeId}
                onChange={(e) => onUpdate({ storeId: e.target.value })}
                className={[
                  inputClass,
                  draft.errors.storeId ? "border-bimbi-pink ring-1 ring-bimbi-pink" : "",
                ].join(" ")}
              >
                <option value="">— Pilih toko —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
              {draft.errors.storeId && (
                <p className="mt-0.5 text-xs text-bimbi-pink-dark">
                  {draft.errors.storeId}
                </p>
              )}
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kategori <span className="text-bimbi-pink-dark">*</span>
              </label>
              <select
                value={draft.categoryId}
                onChange={(e) => onUpdate({ categoryId: e.target.value })}
                className={[
                  inputClass,
                  draft.errors.categoryId ? "border-bimbi-pink ring-1 ring-bimbi-pink" : "",
                ].join(" ")}
              >
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {draft.errors.categoryId && (
                <p className="mt-0.5 text-xs text-bimbi-pink-dark">
                  {draft.errors.categoryId}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={draft.saving}
              className="bg-bimbi-mint hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-2 rounded-md transition-colors cursor-pointer"
            >
              {draft.saving ? "Menyimpan…" : "Simpan Rak"}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={draft.saving}
              className="text-slate-400 hover:text-bimbi-pink-dark font-semibold text-sm transition-colors cursor-pointer"
            >
              Buang
            </button>
            <span className="ml-auto text-xs text-slate-300 select-none">
              Foto sudah terunggah — isi detail untuk menyimpan ke daftar rak
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
