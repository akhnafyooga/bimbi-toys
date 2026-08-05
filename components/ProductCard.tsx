import Link from "next/link";
import Image from "next/image";
import { formatIDR } from "@/lib/format";
import { applyDiscount } from "@/lib/discount";
import CardActions from "@/components/CardActions";

type Props = {
  /** Needed for the wishlist + cart buttons; omit to render a link-only card. */
  productId?: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
  /** "Harga spesial kenalan" percentage for the signed-in user (0 = none). */
  discountPercent?: number;
  wishlisted?: boolean;
};

// LEGO-store card: SHARP corners, tall proportions, product photo on white with
// generous padding, then title -> price -> full-width orange cart button.
// No rating stars — they were decorative and every product showed the same 4/5.
// The card is a <div>, not a <Link>: the heart and cart controls are real
// buttons and cannot legally live inside an anchor.
export default function ProductCard({
  productId,
  slug,
  name,
  price,
  compareAtPrice,
  imageUrl,
  discountPercent = 0,
  wishlisted = false,
}: Props) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  // A special price replaces the normal one and strikes the original through.
  const special = discountPercent > 0;
  const finalPrice = applyDiscount(price, discountPercent);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden border border-slate-200 bg-white p-3 shadow-card shadow-card-hover card-lively">
      {special ? (
        <span className="absolute top-2 right-2 z-20 bg-bimbi-sky px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Spesial
        </span>
      ) : discount > 0 ? (
        <span className="absolute top-2 right-2 z-20 bg-wm-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          −{discount}%
        </span>
      ) : null}

      <Link href={`/product/${slug}`} className="flex flex-1 flex-col">
        {/* Photo on white with breathing room — LEGO never crops product shots */}
        <div className="relative aspect-square w-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-slate-200">🧸</div>
          )}
        </div>

        {/* Title takes the slack so every card in a row ends the same height and
            the prices line up across the grid. */}
        <h3 className="mt-3 min-h-[3.4rem] flex-1 text-[13px] font-normal leading-snug text-bimbi-grape line-clamp-3 group-hover:underline">
          {name}
        </h3>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-base font-extrabold tracking-tight ${
              special ? "text-bimbi-sky" : "text-bimbi-ink"
            }`}
          >
            {formatIDR(finalPrice)}
          </span>
          {special ? (
            <span className="text-[11px] text-slate-400 line-through">{formatIDR(price)}</span>
          ) : (
            compareAtPrice && (
              <span className="text-[11px] text-slate-400 line-through">
                {formatIDR(compareAtPrice)}
              </span>
            )
          )}
        </div>
      </Link>

      {/* Rendered last on purpose: the cart button follows normal flow, so its
          DOM position IS its visual position. The heart is absolute, so it
          stays pinned top-left regardless of where this sits. */}
      {productId && <CardActions productId={productId} wishlisted={wishlisted} />}

      {!productId && (
        <Link
          href={`/product/${slug}`}
          className="mt-2 -mx-3 -mb-3 w-[calc(100%+1.5rem)] bg-[#f26722] hover:bg-[#d9551a] px-2 py-1.5 text-center text-[11px] font-bold text-white transition-colors btn-press"
        >
          Tambahkan
        </Link>
      )}
    </div>
  );
}
