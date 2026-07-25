import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";

export default async function Footer() {
  // Single source of truth: the same StoreLocation rows the admin panel edits.
  const stores = await prisma.storeLocation.findMany({
    orderBy: { city: "asc" },
    select: { id: true, name: true, city: true },
  });

  return (
    <footer className="mt-20 bg-bimbi-cream border-t border-slate-200 text-bimbi-ink">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 flex flex-col items-center gap-6 text-center">
        {/* Logo slot (user artwork: public/brand/logo-full.png) */}
        <Link href="/" className="text-slate-500">
          <BrandLogo variant="full" height={36} />
        </Link>

        <p className="text-sm text-slate-500 max-w-md">
          Toko mainan, hadiah, dan perlengkapan terlengkap. Ambil langsung di toko
          terdekat atau pesan antar — bayar gampang pakai QRIS.
        </p>

        {/* Category links row */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
          <li><Link href="/?category=action-figure" className="hover:text-bimbi-pink hover:underline">Action Figure</Link></li>
          <li><Link href="/?category=boneka" className="hover:text-bimbi-pink hover:underline">Boneka</Link></li>
          <li><Link href="/?category=board-game" className="hover:text-bimbi-pink hover:underline">Board Game</Link></li>
          <li><Link href="/?category=mainan-edukasi" className="hover:text-bimbi-pink hover:underline">Mainan Edukasi</Link></li>
          <li>
            <Link href="/stores" className="text-bimbi-pink hover:underline inline-flex items-center gap-1">
              Cari Toko Terdekat <AppIcon name="location" size={16} />
            </Link>
          </li>
        </ul>

        {/* Store list row — from the database */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-slate-500">
          {stores.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1">
              <AppIcon name="location" size={13} /> {s.name} — {s.city}
            </li>
          ))}
        </ul>

        <div className="w-full border-t border-slate-200 pt-5 text-xs text-slate-400">
          © {new Date().getFullYear()} Bimbi Toys. Main terus, belajar terus! ·
          Pembayaran aman via QRIS — GoPay, OVO, Dana, ShopeePay, m-Banking.
        </div>
      </div>
    </footer>
  );
}
