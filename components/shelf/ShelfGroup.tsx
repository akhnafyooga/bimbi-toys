import ShelfCard, { type ShelfCardData } from "@/components/shelf/ShelfCard";

// One shelf category section: a section header in the site's voice followed
// by the shelves. Mobile: horizontally scrollable snap row.
// Desktop: a calm grid.
export default function ShelfGroup({
  categoryName,
  shelves,
}: {
  categoryName: string;
  shelves: ShelfCardData[];
}) {
  if (shelves.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-extrabold text-bimbi-ink">{categoryName}</h2>
        <span className="text-xs font-semibold text-slate-400 tabular-nums">{shelves.length} rak</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 lg:grid-cols-4">
        {shelves.map((shelf, i) => (
          <div key={shelf.id} className="w-64 shrink-0 snap-start md:w-auto">
            <ShelfCard shelf={shelf} priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
