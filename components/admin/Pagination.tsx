import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
};

export default function Pagination({ page, totalPages, makeHref }: Props) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
          prevDisabled
            ? "pointer-events-none opacity-40 border-slate-200 text-slate-400"
            : "border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        ← Sebelumnya
      </Link>
      <span className="text-sm text-slate-500 px-2">
        Halaman {page} dari {totalPages}
      </span>
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
          nextDisabled
            ? "pointer-events-none opacity-40 border-slate-200 text-slate-400"
            : "border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        Selanjutnya →
      </Link>
    </div>
  );
}
