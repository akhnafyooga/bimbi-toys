import PendingLink from "@/components/PendingLink";
import ShelfImageFrame from "@/components/shelf/ShelfImageFrame";
import { formatShelfRange } from "@/lib/shelf";

export type ShelfCardData = {
  id: string;
  name: string;
  code: string;
  image: string | null;
  priceMin: number | null;
  priceMax: number | null;
};

// One shelf, presented as a physical rack: photo, name, and the manually
// curated price range. No item count and no product list — shoppers open the
// shelf and ask via WhatsApp for details.
export default function ShelfCard({ shelf, priority = false }: { shelf: ShelfCardData; priority?: boolean }) {
  return (
    <PendingLink
      href={`/store/${shelf.id}`}
      className="group relative block overflow-hidden border border-slate-200 bg-white shadow-card card-lively"
      label={`Lihat rak ${shelf.name} (${shelf.code})`}
      overlayLabel={null}
    >
      <div className="relative">
        <ShelfImageFrame src={shelf.image} code={shelf.code} priority={priority} />
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold leading-snug text-bimbi-grape group-hover:underline">{shelf.name}</h3>

        {shelf.priceMin !== null && shelf.priceMax !== null ? (
          <p className="mt-1 text-sm font-extrabold tracking-tight text-bimbi-ink tabular-nums">
            {formatShelfRange(shelf.priceMin, shelf.priceMax)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">Tanya harga via WhatsApp</p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Rak {shelf.code}</span>
          <span className="text-sm font-bold text-bimbi-pink-dark">Lihat Rak →</span>
        </div>
      </div>
    </PendingLink>
  );
}
