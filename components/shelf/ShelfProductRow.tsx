import PendingLink from "@/components/PendingLink";
import { formatIDR } from "@/lib/format";
import { availabilityFor, AVAILABILITY_LABEL, storeQty } from "@/lib/shelf";

export type ShelfProductRowData = {
  productId: string;
  slug: string;
  name: string;
  categoryName: string;
  price: number;
  globalStock: number;
  storeStock: number | null | undefined;
};

function AvailabilityDot({ qty }: { qty: number }) {
  const level = availabilityFor(qty);
  const color = level === "in" ? "bg-emerald-600" : level === "low" ? "bg-amber-500" : "bg-slate-300";
  const label = AVAILABILITY_LABEL[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  );
}

// One product on a shelf: a quiet, typographic row — name, price, small
// metadata, availability, and a link into the existing product page.
// Deliberately NOT the ecommerce product card, and no product images.
export default function ShelfProductRow({ product }: { product: ShelfProductRowData }) {
  const qty = storeQty(product.globalStock, product.storeStock);

  return (
    <PendingLink
      href={`/product/${product.slug}`}
      label={product.name}
      overlayLabel={null}
      className="group relative flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-bold text-bimbi-grape leading-snug group-hover:underline">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-extrabold text-bimbi-ink tabular-nums">{formatIDR(product.price)}</span>
          {product.categoryName && (
            <span className="text-[11px] text-slate-400">{product.categoryName}</span>
          )}
          <AvailabilityDot qty={qty} />
        </div>
      </div>
      <span
        className="shrink-0 text-lg text-slate-300 group-hover:text-bimbi-pink-dark transition-colors"
        aria-hidden
      >
        →
      </span>
    </PendingLink>
  );
}
