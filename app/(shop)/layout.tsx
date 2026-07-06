import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bimbi Toys — Toko Mainan Online Paling Asyik",
  description:
    "Belanja mainan online: action figure, boneka, board game, diecast, mainan edukasi, dan lainnya. Ambil di toko atau kirim ke rumah, bayar pakai QRIS!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${baloo.variable} ${nunito.variable} antialiased flex min-h-screen flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
