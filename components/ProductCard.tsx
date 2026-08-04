import Link from "next/link";
import Image from "next/image";
import { formatIDR } from "@/lib/format";
import { applyDiscount } from "@/lib/discount";

type Props = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
  /** "Harga spesial kenalan" percentage for the signed-in user (0 = none). */
  discountPercent?: number;
};

// Walmart-style card: flat white, red deal badge, rounded "+ Tambah" pill,
// bold price + green savings line. Border appears only on hover.
export default function ProductCard({
  slug,
  name,
  price,
  compareAtPrice,
  imageUrl,
  discountPercent = 0,
}: Props) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  const savings = compareAtPrice ? compareAtPrice - price : 0;
  // A special price replaces the normal one and strikes the original through.
  const special = discountPercent > 0;
  const finalPrice = applyDiscount(price, discountPercent);

  return (
    <Link
      href={`/product/${slug}`}
      className="group block rounded-sm bg-white border border-slate-200 hover:border-bimbi-pink/40 p-3 shadow-card shadow-card-hover card-lively flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xs bg-slate-50 flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-w-7xl) 20vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-5xl text-slate-300"></div>
          )}
          {special ? (
            <span className="absolute top-2 left-2 rounded-sm bg-bimbi-pink px-1.5 py-0.5 text-[11px] font-extrabold text-white z-10">
              Spesial −{discountPercent}%
            </span>
          ) : discount > 0 ? (
            <span className="absolute top-2 left-2 rounded-sm bg-wm-red px-1.5 py-0.5 text-[11px] font-extrabold text-white z-10">
              Hemat {discount}%
            </span>
          ) : null}
          {/* "+ Tambah" pill, Walmart-style, bottom-left of the image */}
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-bimbi-ink group-hover:border-bimbi-pink group-hover:text-bimbi-pink transition-colors">
            + Tambah
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className={`font-extrabold text-lg ${special ? "text-bimbi-pink" : "text-bimbi-ink"}`}>
            {formatIDR(finalPrice)}
          </span>
          {special ? (
            <span className="text-xs text-slate-400 line-through">{formatIDR(price)}</span>
          ) : (
            compareAtPrice && (
              <span className="text-xs text-slate-400 line-through">
                {formatIDR(compareAtPrice)}
              </span>
            )
          )}
        </div>
        {special ? (
          <p className="text-xs font-bold text-bimbi-pink">Harga spesial untukmu</p>
        ) : (
          savings > 0 && (
            <p className="text-xs font-bold text-bimbi-mint">Hemat {formatIDR(savings)}</p>
          )
        )}

        {/* Smaller type + 3 lines: names are long descriptive phrases now, so
            two lines at text-sm truncated most of them mid-word. */}
        <h3 className="mt-1 text-xs text-slate-700 leading-snug line-clamp-3 min-h-[3rem] group-hover:underline">
          {name}
        </h3>

        {/* Rating stars */}
        <div className="flex items-center gap-0.5 mt-1 text-amber-400 text-xs">
          <span>★</span><span>★</span><span>★</span><span>★</span><span className="text-slate-200">★</span>
        </div>
      </div>
    </Link>
  );
}
