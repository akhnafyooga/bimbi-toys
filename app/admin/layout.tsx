import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "../globals.css";
import { auth, signOut } from "@/lib/auth";
import Providers from "@/components/Providers";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Panel Admin — Bimbi Toys",
  description: "Kelola produk, pesanan, dan stok toko Bimbi Toys.",
};

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produk", label: "Produk" },
  { href: "/admin/kategori", label: "Kategori" },
  { href: "/admin/pesanan", label: "Pesanan" },
  { href: "/admin/stok-toko", label: "Stok Toko" },
  { href: "/admin/rak", label: "Rak Toko" },
  { href: "/admin/pelanggan", label: "Pelanggan" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // proxy.ts already blocks unauthorized requests before this renders — this
  // is a defense-in-depth check in case a route is ever reached another way.
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  return (
    <html lang="id">
      <body className={`${nunito.variable} antialiased bg-slate-100`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Top bar */}
            <header className="bg-bimbi-grape text-white sticky top-0 z-40 shadow-sm">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <Link href="/admin" className="flex items-center gap-3 shrink-0">
                  <span className="bg-white rounded-md px-2 py-1 flex items-center">
                    <Image
                      src="/logo.png"
                      alt="Bimbi Toys"
                      width={140}
                      height={56}
                      className="h-8 w-auto object-contain"
                      priority
                    />
                  </span>
                  <span className="text-white/60 font-normal text-sm hidden sm:inline">Panel Admin</span>
                </Link>
                <div className="flex items-center gap-3 sm:gap-4 text-sm">
                  <Link
                    href="/"
                    className="hidden sm:inline text-white/80 hover:text-white transition-colors"
                    target="_blank"
                  >
                    Lihat Toko
                  </Link>
                  <span className="hidden md:inline text-white/90">
                    {session.user.name} <span className="text-white/50">({session.user.role === "ADMIN" ? "Admin" : "Staf"})</span>
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer">
                      Keluar
                    </button>
                  </form>
                </div>
              </div>
            </header>

            {/* Section nav — horizontal scroll on small screens, no JS needed */}
            <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 overflow-x-auto">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-1 min-w-max">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-600 hover:text-bimbi-sky hover:bg-bimbi-sun border-b-2 border-transparent hover:border-bimbi-sky transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
