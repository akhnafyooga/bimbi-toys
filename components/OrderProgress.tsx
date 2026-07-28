import { ORDER_STEPS } from "@/lib/orderStatus";

// Three-step order progress: Dipesan → Siap → Selesai.
// Light-green fill up to the current step, with a marking line on every step
// so the buyer can see exactly where their order is.
export default function OrderProgress({
  step,
  size = "md",
}: {
  /** 0-2, or -1 when the order was cancelled/expired */
  step: number;
  size?: "sm" | "md";
}) {
  const last = ORDER_STEPS.length - 1;
  const pct = step <= 0 ? 0 : (Math.min(step, last) / last) * 100;
  const trackH = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div>
      <div className={`relative ${trackH} rounded-full bg-slate-100`}>
        {/* filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-300 transition-all"
          style={{ width: `${pct}%` }}
        />
        {/* marking line on each step */}
        {ORDER_STEPS.map((label, i) => {
          const done = i <= step;
          const current = i === step;
          const at = (i / last) * 100;
          // keep the first/last markers inside the track edges
          const shift = i === 0 ? "0" : i === last ? "-100%" : "-50%";
          return (
            <span
              key={label}
              aria-hidden
              className={`absolute top-1/2 rounded-full ${
                current ? "h-4 w-[3px]" : "h-3 w-[2px]"
              } ${done ? (current ? "bg-emerald-600" : "bg-emerald-400") : "bg-slate-300"}`}
              style={{ left: `${at}%`, transform: `translate(${shift}, -50%)` }}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between">
        {ORDER_STEPS.map((label, i) => (
          <span
            key={label}
            className={`text-[11px] ${
              i === step
                ? "font-bold text-emerald-700"
                : i < step
                  ? "text-emerald-600/70"
                  : "text-slate-400"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
