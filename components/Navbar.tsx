import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import CategoryNav from "@/components/CategoryNav";
import CartBadge from "@/components/CartBadge";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";

export default async function Navbar() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [cartCount, wishlistCount, categories, cartItems, defaultStore] = await Promise.all([
    userId ? prisma.cartItem.count({ where: { userId } }) : 0,
    userId ? prisma.wishlistItem.count({ where: { userId } }) : 0,
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    userId
      ? prisma.cartItem.findMany({
        where: { userId },
        include: { product: true },
      })
      : [],
    prisma.storeLocation.findFirst({ orderBy: { city: "asc" } }),
  ]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <header className="w-full z-50 flex flex-col bg-white">
      {/* ROW 1 — solid blue brand bar: logo, store pill, search, account/cart */}
      <div className="w-full bg-bimbi-pink text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 ">
          {/* Logo slot (user artwork goes in public/brand/) */}
          <Link
            href="/"
            className="shrink-0 chip-spring rounded-md px-2 py-1 flex items-center drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            title="Bimbi Toys"
          >
            <BrandLogo variant="mark" height={36} />
          </Link>

          {/* Store pickup pill */}
          {defaultStore && (
            <Link
              href="/stores"
              className="hidden lg:flex items-center gap-2 rounded-full bg-bimbi-pink-dark/60 hover:bg-bimbi-pink-dark px-4 py-2 text-sm font-bold transition-colors chip-spring"
            >
              <AppIcon name="location" size={22} />
              <span className="flex flex-col leading-tight text-left">
                <span>Ambil di toko</span>
                <span className="text-[11px] font-normal text-white/80">
                  {defaultStore.name} · {defaultStore.city}
                </span>
              </span>
            </Link>
          )}

          {/* Search — big white pill */}
          <form
            id="tour-search"
            action="/search"
            className="order-last w-full md:order-none md:w-auto md:flex-1 flex items-center rounded-full bg-white overflow-hidden"
          >
            <select
              name="category"
              className="hidden sm:block bg-transparent text-slate-600 text-xs font-bold pl-4 pr-2 py-2.5 outline-none cursor-pointer max-w-[140px]"
            >
              <option value="">Semua</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="q"
              placeholder="Cari semua di Bimbi Toys online dan di toko"
              className="flex-1 px-4 py-2.5 text-sm text-bimbi-ink outline-none placeholder:text-slate-400 bg-transparent"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="m-1 h-8 w-8 shrink-0 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors btn-press"
            >
              <AppIcon name="search" size={18} />
            </button>
          </form>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-4 sm:gap-5 text-sm font-semibold">
            <Link
              href="/wishlist"
              className="relative flex items-center gap-2 hover:underline chip-spring"
              title="Wishlist"
            >
              <AppIcon name="wishlist" size={22} />
              <span className="hidden xl:flex flex-col leading-tight text-left">
                <span className="text-[11px] font-normal text-white/80">Disimpan</span>
                <span>Wishlist</span>
              </span>
              <span className="xl:hidden">
                <CartBadge count={wishlistCount} variant="bubble" />
              </span>
            </Link>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <span className="hidden xl:flex flex-col leading-tight text-left">
                  <span className="text-[11px] font-normal text-white/80">
                    Hai, {session.user.name?.split(" ")[0]}!
                  </span>
                  <span>Akunmu</span>
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                  className="inline"
                >
                  <button className="font-bold text-wm-yellow hover:underline cursor-pointer">
                    Keluar
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 hover:underline chip-spring">
                <span className="text-lg">👤</span>
                <span className="hidden xl:flex flex-col leading-tight text-left">
                  <span className="text-[11px] font-normal text-white/80">Masuk</span>
                  <span>Akun</span>
                </span>
              </Link>
            )}

            <Link
              id="tour-cart"
              href="/cart"
              className="relative flex flex-col items-center leading-tight hover:underline chip-spring"
              title="Keranjang"
            >
              <span className="relative">
                <AppIcon name="cart" size={26} />
                <CartBadge count={cartCount} variant="bubble" />
              </span>
              <span className="text-[11px] font-bold mt-0.5">
                {cartCount > 0 ? formatIDR(cartTotal) : "Rp 0"}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 2 — white category strip (sliding, with arrows) */}
      <div className="w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center">
          <CategoryNav categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))} />
          <div className="hidden lg:flex items-center shrink-0">
            <Link
              href="/#katalog"
              className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-wm-red hover:underline transition-colors"
            >
              Penawaran Hari Ini
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
