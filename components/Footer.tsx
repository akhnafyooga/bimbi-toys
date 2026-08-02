import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";
import { normalizePhone } from "@/lib/phone";

// Payment methods are rendered as text chips rather than brand logos: we do not
// hold licensed artwork for GoPay/OVO/Dana, and mocking up their marks would be
// the same trademark problem the catalogue images already have.
const PAYMENTS = ["QRIS", "GoPay", "OVO", "Dana", "ShopeePay", "m-Banking"];

export default async function Footer() {
  // Single source of truth: the same StoreLocation rows the admin panel edits.
  const stores = await prisma.storeLocation.findMany({
    orderBy: { city: "asc" },
    select: { id: true, name: true, city: true, address: true, phone: true },
  });

  const waStore = stores.find((s) => normalizePhone(s.phone ?? ""));
  const waNumber = waStore ? normalizePhone(waStore.phone ?? "") : null;

  // No top margin on the footer: a margin sits OUTSIDE the element and shows
  // the white body between the page background and the wood band.
  return (
    <footer className="text-bimbi-ink">
      {/* Wood band separating the page from the footer (public/wood-strip.webp).
          Deliberately thin — it is a rule, not a panel. */}
      <div
        aria-hidden
        className="h-6 md:h-8 w-full bg-cover bg-center shadow-inner"
        style={{ backgroundImage: "url(/wood-strip.webp)" }}
      />

      <div className="bg-bimbi-cream border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="grid gap-8 lg:gap-6 md:grid-cols-2 lg:grid-cols-[auto_1fr_auto_auto_auto]">

            {/* Logo */}
            <div className="flex items-start lg:items-center lg:pr-8 lg:border-r lg:border-slate-300">
              <Link href="/" aria-label="Bimbi Toys">
                <BrandLogo variant="full" height={44} />
              </Link>
            </div>

            {/* Store addresses */}
            <div className="space-y-5 lg:pl-2">
              {stores.map((s) => (
                <div key={s.id}>
                  <AppIcon name="location" size={20} />
                  <p className="mt-1 font-extrabold text-sm">{s.name}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {s.address}, {s.city}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact — WhatsApp is the real channel here, not social media */}
            <div>
              <p className="font-extrabold text-sm mb-3">Hubungi Kami</p>
              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-300 px-4 py-2 text-sm font-bold hover:border-bimbi-mint hover:text-bimbi-mint transition-colors chip-spring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.7 8.22-8.24 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                  </svg>
                  Chat {waStore?.name}
                </a>
              ) : (
                <p className="text-sm text-slate-600">Kunjungi toko kami langsung.</p>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-3 text-sm font-bold">
              <p className="font-extrabold mb-3">Jelajahi</p>
              <Link href="/#katalog" className="block hover:text-bimbi-pink hover:underline">Semua Koleksi</Link>
              <Link href="/stores" className="block hover:text-bimbi-pink hover:underline">Cari Toko</Link>
              <Link href="/wishlist" className="block hover:text-bimbi-pink hover:underline">Wishlist</Link>
              <Link href="/orders" className="block hover:text-bimbi-pink hover:underline">Pesanan Saya</Link>
            </nav>

            {/* Payment */}
            <div>
              <p className="font-extrabold text-sm mb-3">Pembayaran</p>
              <ul className="flex flex-wrap gap-1.5 max-w-[210px]">
                {PAYMENTS.map((m) => (
                  <li
                    key={m}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-300">
          <p className="mx-auto max-w-7xl px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
            © Bimbi Toys Copyright {new Date().getFullYear()}, All Right Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
