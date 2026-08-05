import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import NavbarGate from "@/components/NavbarGate";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import BackToTop from "@/components/BackToTop";

// Poppins: geometric, heavy at the top weights — the closest free match to the
// bold sans the LEGO store uses. Kept on the same --font-nunito variable so
// every existing `font-display` / body rule picks it up without edits.
const poppins = Poppins({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bimbi Toys — Toko Mainan Online Paling Asyik",
  description:
    "Belanja mainan online: action figure, boneka, board game, diecast, mainan edukasi, dan lainnya. Ambil di toko atau kirim ke rumah, bayar pakai QRIS!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} antialiased flex min-h-screen flex-col`}>
        <Providers>
          <NavbarGate>
            <Navbar />
          </NavbarGate>
          <main className="flex-1">{children}</main>
          <BackToTop />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
