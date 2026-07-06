import Image from "next/image";
export default function Footer() {
  return (
    <footer className="mt-20 border-t-4 border-bimbi-sky bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <Image
                      src="/logo.png"
                      alt="Bimbi Toys"
                      width={120}
                      height={800}
                      className="mx-auto h-50 w-auto"
                      priority
                    />
          <p className="mt-2 text-sm text-bimbi-ink/70">
            Toko mainan online paling asyik se-Indonesia. Ambil di toko atau kirim ke rumah, semua bisa!
          </p>
        </div>
        <div>
          <p className="font-display text-lg mb-2">Ambil di Toko</p>
          <ul className="text-sm text-bimbi-ink/70 space-y-1">
            <li>📍 Simpang Lima, Semarang</li>
            <li>📍 Green Oase, Rumah Pewe</li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg mb-2">Pembayaran</p>
          <p className="text-sm text-bimbi-ink/70">Bayar gampang pakai QRIS — GoPay, OVO, Dana, ShopeePay, m-Banking, semua bisa scan! ✨</p>
        </div>
      </div>
      <p className="text-center text-xs text-bimbi-ink/50 pb-6">© {new Date().getFullYear()} Bimbi Toys. Main terus, belajar terus!</p>
    </footer>
  );
}
