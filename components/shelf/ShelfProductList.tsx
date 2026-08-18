import ShelfProductRow, { type ShelfProductRowData } from "@/components/shelf/ShelfProductRow";

// The product list of a shelf detail page — text-first, hairline-separated,
// easy to scan with one hand on mobile.
export default function ShelfProductList({ products }: { products: ShelfProductRowData[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-card px-6 py-12 text-center">
        <p className="font-display text-lg font-bold text-slate-800">Belum ada produk di rak ini.</p>
        <p className="mt-1 text-sm text-slate-500">Koleksi rak sedang diperbarui.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card divide-y divide-slate-100 overflow-hidden">
      {products.map((product) => (
        <ShelfProductRow key={product.productId} product={product} />
      ))}
    </div>
  );
}
