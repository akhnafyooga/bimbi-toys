import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Lihat Ada Apa di Toko | Bimbi Toys",
    template: "%s | Bimbi Toys",
  },
  description:
    "Intip koleksi mainan yang tersedia langsung di rak toko Bimbi Toys. Pilih toko, telusuri rak-nya, dan lihat mainan apa saja yang sedang dipajang.",
};

export default function StoreShelfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-6">{children}</div>;
}