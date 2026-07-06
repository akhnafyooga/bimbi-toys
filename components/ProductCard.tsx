import Link from "next/link";
import { formatIDR } from "@/lib/format";
import ImagePlaceholder from "@/components/ImagePlaceholder";

type Props = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
};

export default function ProductCard({ slug, name, price, compareAtPrice, imageUrl}: Props) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  return (
    <Link
      href={`/product/${slug}`}
      className="toy-shelf group block rounded-md bg-white p-3 transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-bimbi-cream">
        <ImagePlaceholder className="h-full w-full" />
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-lg bg-bimbi-mint px-2 py-1 text-xs font-bold text-white shadow">
            -{discount}%
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-base leading-snug line-clamp-2 min-h-[2.6rem]">{name}</p>
    </Link>
  );
}
