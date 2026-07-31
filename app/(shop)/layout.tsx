import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import NavbarGate from "@/components/NavbarGate";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import BackToTop from "@/components/BackToTop";
import ToyEmojiField from "@/components/ToyEmojiField";

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
      <body className={`${nunito.variable} antialiased flex min-h-screen flex-col`}>
        <Providers>
          <NavbarGate>
            <Navbar />
          </NavbarGate>
          {/* relative + isolate so the emoji layer can sit behind the page
              content without escaping into the header or footer */}
          <main className="relative isolate flex-1">
            <ToyEmojiField />
            <div className="relative z-10">{children}</div>
          </main>
          <BackToTop />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
