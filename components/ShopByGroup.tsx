import Image from "next/image";
import PendingLink from "@/components/PendingLink";
import ScrollFocus from "@/components/ScrollFocus";

// "Mau cari apa?" — the two top-level doorways, directly under the hero.
//
// The groups mirror lib/adminGroups.ts exactly (Mainan & Lainnya / Alat Tulis),
// so what the owner manages in the admin panel and what a shopper browses here
// can never drift apart.
const GROUPS = [
  {
    label: "Mainan & Lainnya",
    image: "/brand/banners/mainan-lainnya.webp",
    href: "/?group=mainan#katalog",
  },
  {
    label: "Alat Tulis",
    image: "/brand/banners/alat-tulis.webp",
    href: "/?group=alat-tulis#katalog",
  },
];

export default function ShopByGroup() {
  return (
    <section aria-labelledby="mau-cari-apa">
      <h2
        id="mau-cari-apa"
        className="mb-5 text-center text-sm sm:text-base font-bold text-bimbi-ink"
      >
        Mau cari apa?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {GROUPS.map((g) => (
          <ScrollFocus key={g.label}>
          <PendingLink
            href={g.href}
            label={g.label}
            className="group relative block"
          >
            {/* No card, no background: the artwork is the link. It scales on
                hover with nothing to crop it, so the growth reads cleanly. */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={g.image}
                alt={g.label}
                fill
                sizes="(min-width: 640px) 45vw, 90vw"
                className="object-contain transition-transform duration-500 ease-out group-hover:scale-110"
                priority
              />
            </div>

            <span className="mt-2 block text-center text-xs sm:text-[13px] font-bold text-bimbi-ink group-hover:text-bimbi-sky transition-colors">
              {g.label}
            </span>

          </PendingLink>
          </ScrollFocus>
        ))}
      </div>
    </section>
  );
}
