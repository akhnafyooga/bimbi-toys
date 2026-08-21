import Image from "next/image";
import PendingLink from "@/components/PendingLink";
import Rail from "@/components/Rail";
import { QUICK_TILES } from "@/lib/homeSegments";

// "Yang Kamu Cari" — the shortcut carousel under the hero.
//
// Each tile IS the artwork: a 640x480 card that already contains its own
// coloured panel, product shot and label chip. So there is no border, padding
// or caption here — adding any would double up on what the image draws.
// Widths are set so ~3.5 cards are visible at rest, which is what tells the
// shopper the row scrolls without needing a hint.
export default function QuickTiles() {
  return (
    <section aria-labelledby="yang-kamu-cari">
      <h2
        id="yang-kamu-cari"
        className="text-xl sm:text-2xl md:text-3xl font-extrabold text-bimbi-ink mb-4"
      >
        Yang Kamu Cari
      </h2>

      <Rail showDots>
        {QUICK_TILES.map((t) => (
          <PendingLink
            key={t.label}
            href={t.href}
            label={t.label}
            // 3.5 across on desktop; fewer on small screens, where a 3.5-up
            // card would be too small to read the artwork inside it.
            className="group relative block shrink-0 w-[62%] sm:w-[42%] lg:w-[27%] chip-spring"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={t.image}
                alt={t.label}
                fill
                sizes="(min-width: 1024px) 27vw, (min-width: 640px) 42vw, 62vw"
                className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          </PendingLink>
        ))}
      </Rail>
    </section>
  );
}
