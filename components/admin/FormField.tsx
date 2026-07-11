export const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-bimbi-sky focus:border-bimbi-sky disabled:bg-slate-50 disabled:text-slate-400";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
};

export default function FormField({ label, hint, error, optional, children }: Props) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">(opsional)</span>}
      </span>
      {hint && <span className="block text-xs text-slate-400 mt-0.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="block text-xs font-semibold text-bimbi-pink-dark mt-1">⚠️ {error}</span>}
    </label>
  );
}
