// Four dots travelling top-to-bottom in turn, in the Bimbi logo's colours.
// Server-safe: the motion is pure CSS (.loader-dot in globals.css), so this
// works inside Next's loading.tsx boundaries without a client component.

const DOTS = [
  { color: "var(--color-wm-red)", delay: "0ms" },
  { color: "var(--color-bimbi-sky)", delay: "140ms" },
  { color: "var(--color-bimbi-mint)", delay: "280ms" },
  { color: "var(--color-wm-yellow)", delay: "420ms" },
];

export default function Loader({
  label = "Memuat…",
  size = 14,
}: {
  label?: string | null;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      {/* Height gives the dots room to travel without resizing the row. The gap
          scales with the dots (0.85 ≈ gap-3 at the default size) so the loader
          also fits inside small busy buttons. */}
      <div
        className="flex items-center"
        style={{ height: size * 3, gap: Math.max(4, Math.round(size * 0.85)) }}
      >
        {DOTS.map((d) => (
          <span
            key={d.color}
            className="loader-dot block"
            style={{
              width: size,
              height: size,
              backgroundColor: d.color,
              animationDelay: d.delay,
            }}
          />
        ))}
      </div>
      {label && <p className="text-sm font-bold text-slate-600">{label}</p>}
      <span className="sr-only">Memuat konten</span>
    </div>
  );
}
