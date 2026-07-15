import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Footer() {
  // Single source of truth: the same StoreLocation rows the admin panel edits.
  const stores = await prisma.storeLocation.findMany({
    orderBy: { city: "asc" },
    select: { id: true, name: true, city: true },
  });

  return (
    <footer className="mt-20 bg-slate-900 text-slate-300 border-t-4 border-bimbi-sky">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-4">
        {/* Info Column */}
        <div className="space-y-4">
          <Image
            src="/logo.png"
            alt="Bimbi Toys"
            width={120}
            height={48}
            className="h-10 w-auto brightness-0 invert"
            priority
          />
          <p className="text-sm text-slate-400 leading-relaxed">
            Toko mainan dan hadiah terlengkap di Indonesia.
            <br></br>Ambil langsung di toko terdekat atau kirim ke rumah. Semua bisa!
          </p>
        </div>

        {/* Stores Column */}
        <div>
          <p className="font-display text-white text-base font-bold mb-4 uppercase tracking-wider">Layanan Toko</p>
          <ul className="text-sm space-y-2 text-slate-400">
            {stores.map((s) => (
              <li key={s.id}>📍 {s.name} — {s.city}</li>
            ))}
            <li className="pt-2">
              <Link href="/stores" className="text-bimbi-mint hover:underline font-semibold">
                Cari Toko Terdekat
              </Link>
            </li>
          </ul>
        </div>

        {/* Payment Column */}
        <div>
          <p className="font-display text-white text-base font-bold mb-4 uppercase tracking-wider">Pembayaran Aman</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Bayar gampang pakai QRIS — GoPay, OVO, Dana, ShopeePay, m-Banking, semua bisa scan! ✨
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Bimbi Toys. Main terus, belajar terus!</p>
      </div>
    </footer>
  );
}
