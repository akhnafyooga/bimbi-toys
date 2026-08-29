
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
  /** Category name, shown as the badge inside the card. */
  category?: string;
};

export default function ShelfCard({
  shelf,
  priority = false,
}: {
  shelf: ShelfCardData;
  priority?: boolean;
}) {
  return (
    <PendingLink
      href={`/store/${shelf.id}`}
      className="
        group
        relative
        block
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-white/70
        bg-white/55
        shadow-[0_10px_35px_rgba(15,23,42,0.12)]
        backdrop-blur-xl
        backdrop-saturate-150
        transition-all
        duration-300
        ease-out
        hover:-translate-y-1
        hover:bg-white/65
        hover:shadow-[0_18px_50px_rgba(15,23,42,0.18)]
      "
      label={`Lihat rak ${shelf.name} (${shelf.code})`}
      overlayLabel={null}
    >
      {/* =====================================================
          PHOTO
          ===================================================== */}

      <div className="relative overflow-hidden">
        <ShelfImageFrame
          src={shelf.image}
          code={shelf.code}
          priority={priority}
        />

        {shelf.category && (
          <span
            className="
              absolute
              left-4
              top-4
              z-10
              rounded-full
              border
              border-white/70
              bg-white/75
              px-3
              py-1.5
              text-[10px]
              font-extrabold
              uppercase
              tracking-wide
              text-bimbi-ink
              shadow-sm
              backdrop-blur-md
              backdrop-saturate-150
            "
          >
            {shelf.category}
          </span>
        )}
      </div>

      {/* =====================================================
          INFORMATION
          ===================================================== */}

      <div
        className="
          border-t
          border-white/60
          bg-white/40
          p-5
          backdrop-blur-md
        "
      >
        <h3
          className="
            text-base
            font-bold
            leading-snug
            text-bimbi-grape
            group-hover:underline
          "
        >
          {shelf.name}
        </h3>

        {shelf.priceMin !== null &&
        shelf.priceMax !== null ? (
          <p
            className="
              mt-1
              text-base
              font-extrabold
              tracking-tight
              text-bimbi-ink
              tabular-nums
            "
          >
            {formatShelfRange(
              shelf.priceMin,
              shelf.priceMax
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">
            Tanya harga via WhatsApp
          </p>
        )}

        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            border-t
            border-white/60
            pt-3
          "
        >
          <span
            className="
              text-[11px]
              font-bold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            Rak {shelf.code}
          </span>

          <span
            className="
              text-sm
              font-bold
              text-bimbi-pink-dark
            "
          >
            Lihat Rak →
          </span>
        </div>
      </div>
    </PendingLink>
  );
}