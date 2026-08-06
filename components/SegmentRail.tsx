import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Rail from "@/components/Rail";

type Item = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  price: number;
  compareAtPrice: number | null;
  images: { url: string }[];
};

// One merchandising row: heading + blurb + a horizontally scrollable set of
// cards. Same rail treatment as "Penawaran Hits" so the page reads as one
// system rather than several bolted-together sections.
export default function SegmentRail({
  title,
  blurb,
  href,
  items,
  discountPercent,
  band,
  headingClass,
}: {
  title: string;
  blurb: string;
  href: string;
  items: Item[];
  discountPercent: number;
  band: string;
  headingClass: string;
}) {
  if (!items.length) return null;

  return (
    // Full-bleed band: pulled out to the viewport edges so the colour and its
    // zig-zag hem run the whole width, while the content stays in the grid.
    <section aria-label={title} className={`segment-band full-bleed ${band} pt-6 md:pt-8`}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex items-end justify-between gap-3 mb-5 md:mb-7">
        <div className="min-w-0">
          <h2 className={`text-base sm:text-lg md:text-xl font-extrabold leading-tight ${headingClass}`}>
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">{blurb}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs sm:text-sm font-bold text-bimbi-pink-dark hover:underline"
        >
          Lihat semua
        </Link>
      </div>

      {/* One row only — arrows, touch-scroll and dots reveal the rest. */}
      <Rail showDots maxTrack="lg:max-w-[1040px]">
        {items.map((p) => (
          <div key={p.id} className="w-32 sm:w-36 lg:w-40 shrink-0">
            <ProductCard
              productId={p.id}
              slug={p.slug}
              name={p.displayName ?? p.name}
              price={p.price}
              compareAtPrice={p.compareAtPrice}
              imageUrl={p.images[0]?.url ?? ""}
              discountPercent={discountPercent}
            />
          </div>
        ))}
      </Rail>
      </div>
    </section>
  );
}
