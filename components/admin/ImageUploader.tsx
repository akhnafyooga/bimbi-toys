"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export type ProductImageItem = { url: string; alt?: string };

type UploadState = { id: string; progress: number; error?: string };

function uploadFile(file: File, onProgress: (pct: number) => void): Promise<{ url: string }> {
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
        // ignore parse failure, handled by status check below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve({ url: data.url });
      } else {
        reject(new Error(data.error ?? "Gagal mengunggah foto."));
      }
    };
    xhr.onerror = () => reject(new Error("Gagal mengunggah foto. Periksa koneksi internet kamu."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export default function ImageUploader({
  images,
  onChange,
}: {
  images: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
}) {
  const [uploading, setUploading] = useState<UploadState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const id = crypto.randomUUID();
      setUploading((prev) => [...prev, { id, progress: 0 }]);
      uploadFile(file, (pct) => {
        setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
      })
        .then(({ url }) => {
          setUploading((prev) => prev.filter((u) => u.id !== id));
          onChange([...images, { url, alt: "" }]);
        })
        .catch((err: Error) => {
          setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, error: err.message } : u)));
        });
    });
  }

  function removeImage(index: number) {
    const next = images.slice();
    next.splice(index, 1);
    onChange(next);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-bimbi-sky bg-bimbi-sun" : "border-slate-300 hover:border-bimbi-sky/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="text-3xl"></div>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Seret &amp; lepas foto di sini, atau klik untuk pilih foto
        </p>
        <p className="text-xs text-slate-400 mt-1">JPG, PNG, atau WEBP — maksimal 5MB per foto</p>
      </div>

      {(images.length > 0 || uploading.length > 0) && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.url + i}
              className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
            >
              <Image src={img.url} alt={img.alt || ""} fill sizes="200px" className="object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-bimbi-mint text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Foto Utama
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    className="bg-white/90 text-slate-700 text-xs rounded px-1.5 py-1 cursor-pointer"
                    title="Pindah ke kiri"
                  >
                    
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="bg-bimbi-pink text-white text-xs font-bold rounded px-2 py-1 cursor-pointer"
                  title="Hapus foto"
                >
                  Hapus
                </button>
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    className="bg-white/90 text-slate-700 text-xs rounded px-1.5 py-1 cursor-pointer"
                    title="Pindah ke kanan"
                  >
                    
                  </button>
                )}
              </div>
            </div>
          ))}
          {uploading.map((u) => (
            <div
              key={u.id}
              className="aspect-square rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-3 text-center"
            >
              {u.error ? (
                <>
                  <span className="text-xs text-bimbi-pink-dark font-semibold"> {u.error}</span>
                  <button
                    type="button"
                    onClick={() => setUploading((prev) => prev.filter((x) => x.id !== u.id))}
                    className="mt-1.5 text-xs text-slate-400 underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </>
              ) : (
                <>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-bimbi-sky h-full transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 mt-1.5">Mengunggah... {u.progress}%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
