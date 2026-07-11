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

export default function ProductCard({ slug, name, price, compareAtPrice, imageUrl }: Props) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  return (
    <Link
      href={`/product/${slug}`}
      className="group block rounded-md bg-white border border-slate-100 hover:border-bimbi-sky/20 p-3.5 shadow-card shadow-card-hover flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50 flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-w-7xl) 25vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-5xl text-slate-300">🧸</div>
          )}
          {discount > 0 && (
            <span className="absolute top-2 left-2 rounded bg-bimbi-pink px-2 py-0.5 text-[11px] font-bold text-white shadow-sm z-10">
              -{discount}%
            </span>
          )}
        </div>

        {/* Rating stars */}
        <div className="flex items-center gap-0.5 mt-3 text-amber-400 text-xs">
          <span>★</span><span>★</span><span>★</span><span>★</span><span className="text-slate-200">★</span>
        </div>

        <h3 className="mt-1 font-display text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.4rem] group-hover:text-bimbi-sky transition-colors">
          {name}
        </h3>
      </div>

      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="font-display font-bold text-base text-bimbi-sky">
          {formatIDR(price)}
        </span>
        {compareAtPrice && (
          <span className="text-xs text-slate-400 line-through">
            {formatIDR(compareAtPrice)}
          </span>
        )}
      </div>
    </Link>
  );
}
