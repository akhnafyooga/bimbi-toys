import PendingLink from "@/components/PendingLink";
import { formatIDR } from "@/lib/format";
import ShelfImageFrame from "@/components/shelf/ShelfImageFrame";

export type ShelfCardData = {
  id: string;
  name: string;
  code: string;
  image: string | null;
  productCount: number;
  minPrice: number | null;
  maxPrice: number | null;
};

// One shelf, presented as a physical rack: photo, name, live price range,
// item count, and the "Lihat Rak" action. Pure presentational — all stats are
// computed from assigned products by the caller.
export default function ShelfCard({ shelf, priority = false }: { shelf: ShelfCardData; priority?: boolean }) {
  return (
    <PendingLink
      href={`/store/${shelf.id}`}
      className="group relative block overflow-hidden border border-slate-200 bg-white shadow-card card-lively"
      label={`Lihat rak ${shelf.name} (${shelf.code})`}
    >
      <div className="relative">
        <ShelfImageFrame src={shelf.image} code={shelf.code} priority={priority} />
        <span className="absolute top-2 right-2 bg-bimbi-sky px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {shelf.productCount} item
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold leading-snug text-bimbi-grape group-hover:underline">{shelf.name}</h3>

        {shelf.minPrice !== null && shelf.maxPrice !== null ? (
          <p className="mt-1 text-sm font-extrabold tracking-tight text-bimbi-ink tabular-nums">
            {shelf.minPrice === shelf.maxPrice
              ? formatIDR(shelf.minPrice)
              : `${formatIDR(shelf.minPrice)} – ${formatIDR(shelf.maxPrice)}`}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-slate-400">Belum ada produk di rak ini</p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Rak {shelf.code}</span>
          <span className="text-sm font-bold text-bimbi-pink-dark">Lihat Rak →</span>
        </div>
      </div>
    </PendingLink>
  );
}
