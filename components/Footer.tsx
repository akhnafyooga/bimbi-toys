import Image from "next/image";
import Link from "next/link";

export default function Footer() {
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
            Toko mainan online paling asyik se-Indonesia. Ambil langsung di toko terdekat atau kirim ke rumah. Semua bisa!
          </p>
        </div>

        {/* Links Column */}
        <div>
          <p className="font-display text-white text-base font-bold mb-4 uppercase tracking-wider">Kategori Populer</p>
          <ul className="text-sm space-y-2 text-slate-400">
            <li><Link href="/?category=action-figure" className="hover:text-white transition-colors">Action Figure</Link></li>
            <li><Link href="/?category=boneka" className="hover:text-white transition-colors">Boneka</Link></li>
            <li><Link href="/?category=board-game" className="hover:text-white transition-colors">Board Game</Link></li>
            <li><Link href="/?category=mainan-edukasi" className="hover:text-white transition-colors">Mainan Edukasi</Link></li>
          </ul>
        </div>

        {/* Stores Column */}
        <div>
          <p className="font-display text-white text-base font-bold mb-4 uppercase tracking-wider">Layanan Toko</p>
          <ul className="text-sm space-y-2 text-slate-400">
            <li>📍 Simpang Lima, Semarang</li>
            <li>📍 Green Oase, Rumah Pewe</li>
            <li className="pt-2">
              <Link href="/stores" className="text-bimbi-mint hover:underline font-semibold">
                Cari Toko Terdekat 📍
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
          <div className="mt-3 flex gap-2 text-2xl">
            💳 📱 🪙
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Bimbi Toys. Main terus, belajar terus!</p>
      </div>
    </footer>
  );
}
