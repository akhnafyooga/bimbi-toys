import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { formatIDR } from "@/lib/format";

export default async function Navbar() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [cartCount, wishlistCount, categories, cartItems] = await Promise.all([
    userId ? prisma.cartItem.count({ where: { userId } }) : 0,
    userId ? prisma.wishlistItem.count({ where: { userId } }) : 0,
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    userId
      ? prisma.cartItem.findMany({
          where: { userId },
          include: { product: true },
        })
      : [],
  ]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <header className="w-full z-50 flex flex-col bg-white">
      {/* 1. TOP UTILITY BAR (Navy Blue) */}
      <div className="w-full bg-bimbi-grape text-white text-[13px] border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-2">
          {/* Left info */}
          <div className="flex items-center gap-4 text-white/80">
            <span>Rupiah (IDR)</span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="hidden md:inline">+62 812-3456-7890</span>
          </div>

          {/* Right menu links */}
          <div className="flex items-center gap-4 sm:gap-6 font-semibold">
            <Link href="/stores" className="hover:text-bimbi-pink transition-colors">
              📍 Toko Kami
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/wishlist" className="hover:text-bimbi-pink transition-colors flex items-center gap-1">
              💖 Wishlist ({wishlistCount})
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/cart" className="hover:text-bimbi-pink transition-colors flex items-center gap-1">
              🛒 Keranjang ({cartCount})
            </Link>
            <span className="text-white/20">|</span>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <span className="text-white/90">
                  Hai, {session.user.name?.split(" ")[0]}!
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                  className="inline"
                >
                  <button className="text-[13px] font-bold text-bimbi-pink hover:underline cursor-pointer">
                    Keluar
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="hover:text-bimbi-pink transition-colors font-bold">
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. MIDDLE BRANDING ROW (White) */}
      <div className="w-full border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
          {/* Logo on the left */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image
              src="/logo.png"
              alt="Bimbi Toys"
              width={200}
              height={80}
              className="h-14 w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
          </Link>

          {/* Search bar with Categories Dropdown */}
          <form
            id="tour-search"
            action="/search"
            className="flex w-full max-w-2xl border-2 border-bimbi-sky rounded-md overflow-hidden bg-white shadow-sm"
          >
            <select
              name="category"
              className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer max-w-[150px] sm:max-w-none font-semibold rounded-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="q"
              placeholder="Cari mainan favoritmu di sini..."
              className="flex-1 px-4 py-2 text-sm outline-none placeholder:text-slate-400 text-bimbi-ink"
            />
            <button
              type="submit"
              className="bg-bimbi-sky hover:bg-blue-800 text-white px-6 py-2.5 font-bold text-sm transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Cari 🔍
            </button>
          </form>

          {/* Cart Box (Green) */}
          <Link
            id="tour-cart"
            href="/cart"
            className="flex items-center gap-3 bg-bimbi-mint hover:bg-emerald-600 text-white px-5 py-2.5 rounded-md font-bold text-sm transition-colors shadow-sm shrink-0"
          >
            <span className="text-lg">🛒</span>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase tracking-wider text-emerald-100 font-semibold leading-tight">Keranjang</span>
              <span className="text-xs leading-none">
                {cartCount > 0 ? `${cartCount} item - ${formatIDR(cartTotal)}` : "Kosong"}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. BOTTOM NAVIGATION BAR (Primary Blue) */}
      <div className="w-full bg-bimbi-sky text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center">
          <nav className="flex flex-wrap items-center">
            <Link
              href="/"
              className="px-5 py-3.5 font-bold text-sm hover:bg-blue-800 transition-colors border-r border-blue-600/40"
            >
              HOME
            </Link>
            {categories.slice(0, 7).map((c) => (
              <Link
                key={c.id}
                href={`/?category=${c.slug}`}
                className="px-4 py-3.5 font-semibold text-xs hover:bg-blue-800 transition-colors border-r border-blue-600/40 uppercase"
              >
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:flex items-center">
            <Link
              href="/#katalog"
              className="bg-bimbi-pink hover:bg-bimbi-pink-dark px-4 py-3.5 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1"
            >
              Penawaran Hari Ini
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
