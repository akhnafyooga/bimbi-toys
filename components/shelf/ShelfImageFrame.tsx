import Image from "next/image";

// The shelf photo is the hero of the shelf system. When a shelf has no photo
// yet, fall back to a quiet typographic plate (the rack code) — never fake
// shelf imagery.
export default function ShelfImageFrame({
  src,
  code,
  sizes = "(max-width: 768px) 80vw, 320px",
  priority = false,
}: {
  src?: string | null;
  code: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={src}
          alt={`Foto rak ${code}`}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center gap-1">
      <span className="text-lg font-extrabold uppercase tracking-widest text-slate-300">{code}</span>
      <span className="text-[11px] text-slate-400">foto rak segera hadir</span>
    </div>
  );
}
