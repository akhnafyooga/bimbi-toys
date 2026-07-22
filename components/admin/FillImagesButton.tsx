"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Repeatedly calls the backfill endpoint in small batches until no products are
// missing images, showing running progress. Each batch is one request so we stay
// clear of serverless time limits even for a large catalog.
export default function FillImagesButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setStatus("Mencari gambar…");
    let totalFilled = 0;

    try {
      // One product per request keeps each serverless call well under Vercel
      // Hobby's 10s cap; the loop drives the volume. Cap is a safety net —
      // 300 requests = 300 products in a single click.
      for (let batch = 0; batch < 300; batch++) {
        const res = await fetch("/api/admin/products/fill-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 1 }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus(data.error ?? "Gagal mengisi gambar.");
          return;
        }

        totalFilled += data.filled ?? 0;
        if (data.remaining === 0 || data.processed === 0) {
          setStatus(`Selesai — ${totalFilled} gambar terisi.`);
          return;
        }
        // A batch that filled nothing means the remaining products can't be
        // auto-filled — stop rather than reprocess the same ones (wastes credits).
        if ((data.filled ?? 0) === 0) {
          setStatus(`Berhenti — ${totalFilled} terisi; ${data.remaining} produk tak dapat gambar otomatis.`);
          return;
        }
        setStatus(`Terisi ${totalFilled}… sisa ${data.remaining} produk.`);
      }
      setStatus(`Berhenti sementara — ${totalFilled} terisi. Klik lagi untuk melanjutkan.`);
    } catch {
      setStatus("Terjadi kesalahan jaringan. Coba lagi ya.");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {status && <span className="text-xs text-slate-500 max-w-[220px]">{status}</span>}
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 font-bold text-sm px-4 py-2.5 rounded-md transition-colors"
      >
        {running ? "Mengisi gambar…" : "Isi gambar otomatis"}
      </button>
    </div>
  );
}
