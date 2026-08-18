import Link from "next/link";
import { formatIDR } from "@/lib/format";

export type ShelfSearchHit = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  shelfId: string;
  shelfName: string;
  shelfCode: string;
};

// Results for "Cari mainan di toko..." — products that live on a shelf in the
// selected store, each pointing back at its shelf.
export default function ShelfSearchResults({ query, hits }: { query: string; hits: ShelfSearchHit[] }) {
  if (hits.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-card px-6 py-12 text-center">
        <p className="font-display text-lg font-bold text-slate-800">
          Tidak ada &quot;{query}&quot; di rak toko ini.
        </p>
        <p className="mt-1 text-sm text-slate-500">Coba kata lain, atau lihat semua rak di bawah.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card divide-y divide-slate-100 overflow-hidden">
      {hits.map((hit) => (
        <div key={hit.productId} className="group flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
          <div className="min-w-0">
            <Link
              href={`/product/${hit.slug}`}
              className="text-sm sm:text-base font-bold text-bimbi-grape leading-snug hover:underline"
            >
              {hit.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-extrabold text-bimbi-ink tabular-nums">{formatIDR(hit.price)}</span>
              <Link
                href={`/store/${hit.shelfId}`}
                className="text-[11px] font-bold text-bimbi-pink-dark hover:underline"
              >
                {hit.shelfName} · Rak {hit.shelfCode}
              </Link>
            </div>
          </div>
          <Link
            href={`/store/${hit.shelfId}`}
            className="shrink-0 text-lg text-slate-300 group-hover:text-bimbi-pink-dark transition-colors"
            aria-label={`Lihat rak ${hit.shelfCode}`}
          >
            →
          </Link>
        </div>
      ))}
    </div>
  );
}
