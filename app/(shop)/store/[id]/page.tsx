import type { Metadata } from "next";
import PendingLink from "@/components/PendingLink";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatShelfRange } from "@/lib/shelf";
import { normalizePhone } from "@/lib/phone";
import { isContactReady, waLink } from "@/lib/storeContacts";
import ShelfPhotoViewer from "@/components/shelf/ShelfPhotoViewer";
import CoachMark from "@/components/CoachMark";

async function getShelf(id: string) {
  return prisma.shelf.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, city: true, phone: true } },
      category: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    select: { name: true, code: true, description: true },
  });
  if (!shelf) return { title: "Rak tidak ditemukan" };
  return {
    title: `${shelf.name} — Rak ${shelf.code}`,
    description:
      shelf.description ??
      `Mainan yang tersedia di rak ${shelf.code} (${shelf.name}) Bimbi Toys.`,
  };
}

// The shelf page deliberately does NOT list the products on the shelf — it
// shows the shelf photo, its description, and one curated price range. For
// anything more specific (availability, exact prices, details), the shopper
// marks the product on the photo and asks the store via WhatsApp.
export default async function ShelfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shelf = await getShelf(id);
  if (!shelf || !shelf.active) notFound();

  const whatsapp = normalizePhone(shelf.store.phone ?? "") ?? "";
  const ready = isContactReady(whatsapp);
  const askMessage = `Halo, saya mau tanya isi rak ${shelf.code} — ${shelf.name} di ${shelf.store.name} 😊`;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14 space-y-8">
        <PendingLink
          href={`/store?toko=${shelf.store.id}`}
          label="Kembali ke daftar rak"
          overlayLabel={null}
          className="relative inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Kembali
        </PendingLink>

        {/* Interactive shelf photo — zoom, pan, circle a product, ask the store */}
        {shelf.image && (
          <>
            <ShelfPhotoViewer
              shelfId={shelf.id}
              image={shelf.image}
              code={shelf.code}
              name={shelf.name}
              storeName={shelf.store.name}
              whatsapp={whatsapp}
            />
            {/* One-shot hint teaching the Tandai button (target lives inside
                the viewer). Inside the image branch so no-photo shelves —
                which never render the button — don't burn the flag. */}
            <CoachMark
              selector='[data-tour="tandai"]'
              storageKey="bimbi-coachmark-tandai-v1"
              title="Tandai mainan yang kamu suka"
              text="Pencet tombol ini untuk menandai yang menarik perhatianmu"
            />
          </>
        )}

        {/* Shelf masthead */}
        <header className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-widest text-bimbi-pink">
            {shelf.category.name} · {shelf.store.name}
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-bimbi-ink leading-tight">
            {shelf.name}
          </h1>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Rak {shelf.code}</p>

          {shelf.priceMin !== null && shelf.priceMax !== null && (
            <p className="pt-1 text-lg sm:text-xl font-extrabold text-bimbi-ink tabular-nums">
              {formatShelfRange(shelf.priceMin, shelf.priceMax)}
            </p>
          )}

          {shelf.description && (
            <p className="max-w-xl text-sm leading-relaxed text-slate-600">{shelf.description}</p>
          )}
        </header>

        {/* WhatsApp flow — all product info lives here, answered manually by
            the store. Visible even without a photo; the photo viewer has its
            own marked-product CTA on top of this. */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-card px-6 py-6 space-y-3">
          <h2 className="text-base sm:text-lg font-extrabold text-bimbi-ink">Mau tahu isi rak ini?</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Tandai mainan di foto rak, atau tanya langsung — tim toko balas detail produk &amp; harga terbarunya
            lewat WhatsApp.
          </p>
          {ready ? (
            <a
              href={waLink(whatsapp, askMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1FB356] px-7 py-3 text-sm sm:text-base font-extrabold text-white shadow chip-spring transition-colors"
            >
              Tanya isi rak via WhatsApp
            </a>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-400">
              Toko ini belum punya WhatsApp aktif
            </span>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
          Stok toko berubah sepanjang hari — pesanan akhir dikonfirmasi lewat WhatsApp toko.
        </footer>
      </div>
    </div>
  );
}
