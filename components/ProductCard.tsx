import Link from "next/link";
import Image from "next/image";
import { formatIDR } from "@/lib/format";

type Props = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
};

// Walmart-style card: flat white, red deal badge, rounded "+ Tambah" pill,
// bold price + green savings line. Border appears only on hover.
export default function ProductCard({ slug, name, price, compareAtPrice, imageUrl }: Props) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  const savings = compareAtPrice ? compareAtPrice - price : 0;

  return (
    <Link
      href={`/product/${slug}`}
      className="group block rounded-lg bg-white border border-transparent hover:border-slate-200 p-3 shadow-none hover:shadow-card card-lively flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-square overflow-hidden rounded-md bg-slate-50 flex items-center justify-center">
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
          {discount > 0 && (
            <span className="absolute top-2 left-2 rounded-sm bg-wm-red px-1.5 py-0.5 text-[11px] font-extrabold text-white z-10">
              Hemat {discount}%
            </span>
          )}
          {/* "+ Tambah" pill, Walmart-style, bottom-left of the image */}
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-bimbi-ink group-hover:border-bimbi-pink group-hover:text-bimbi-pink transition-colors">
            + Tambah
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="font-extrabold text-lg text-bimbi-ink">
            {formatIDR(price)}
          </span>
          {compareAtPrice && (
            <span className="text-xs text-slate-400 line-through">
              {formatIDR(compareAtPrice)}
            </span>
          )}
        </div>
        {savings > 0 && (
          <p className="text-xs font-bold text-bimbi-mint">Hemat {formatIDR(savings)}</p>
        )}

        <h3 className="mt-1 text-sm text-slate-700 leading-snug line-clamp-2 min-h-[2.4rem] group-hover:underline">
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
