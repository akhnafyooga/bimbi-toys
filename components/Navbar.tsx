import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import CategoryNav from "@/components/CategoryNav";
import CartBadge from "@/components/CartBadge";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";
import MobileNavPanel from "@/components/MobileNavPanel";

// Shared look for one mobile nav tile: icon on top, label underneath.
const TILE =
  "flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 px-1 text-[11px] font-bold text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

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
      <div className="w-full bg-white text-bimbi-ink border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 md:py-4">

          {/* ===== MOBILE — row 1: logo on its own line ===== */}
          <div className="md:hidden flex justify-center pt-0.5 pb-1">
            <Link href="/" className="chip-spring flex items-center" title="Bimbi Toys">
              <BrandLogo variant="mark" height={36} heightClass="h-8" />
            </Link>
          </div>

          {/* ===== DESKTOP — account left · logo center · wishlist+cart right ===== */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 min-w-0 text-sm font-semibold">
              {session?.user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/orders"
                    className="flex flex-col leading-tight text-left hover:underline chip-spring"
                    title="Pesanan Saya"
                  >
                    <span className="text-[11px] font-normal text-slate-500 hidden xl:block">
                      Hai, {session.user.name?.split(" ")[0]}!
                    </span>
                    <span className="font-bold">Pesanan Saya</span>
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                    className="inline"
                  >
                    <button className="font-bold text-bimbi-pink hover:underline cursor-pointer">
                      Keluar
                    </button>
                  </form>
                </div>
              ) : (
                <Link href="/login" className="flex items-center gap-2 hover:underline chip-spring">
                  <span className="hidden sm:flex flex-col leading-tight text-left">
                    <span className="text-[11px] font-normal text-slate-500">Masuk</span>
                    <span>Akun</span>
                  </span>
                </Link>
              )}

              {defaultStore && (
                <Link
                  href="/stores"
                  className="hidden lg:flex items-center gap-2 rounded-full bg-bimbi-cream hover:bg-slate-200 px-4 py-2 text-sm font-bold transition-colors chip-spring"
                >
                  <AppIcon name="location" size={22} />
                  <span className="flex flex-col leading-tight text-left">
                    <span>Ambil di toko</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {defaultStore.name} · {defaultStore.city}
                    </span>
                  </span>
                </Link>
              )}
            </div>

            <Link
              href="/"
              className="shrink-0 chip-spring rounded-lg px-2.5 py-1 flex items-center"
              title="Bimbi Toys"
            >
              <BrandLogo variant="mark" height={36} heightClass="h-7 sm:h-8" />
            </Link>

            <div className="flex-1 flex items-center justify-end gap-4 sm:gap-5 text-sm font-semibold">
              <Link
                href="/wishlist"
                className="relative flex items-center gap-2 hover:underline chip-spring"
                title="Wishlist"
              >
                <AppIcon name="wishlist" size={22} />
                <span className="hidden xl:flex flex-col leading-tight text-left">
                  <span className="text-[11px] font-normal text-slate-500">Disimpan</span>
                  <span>Wishlist</span>
                </span>
                <span className="xl:hidden">
                  <CartBadge count={wishlistCount} variant="bubble" />
                </span>
              </Link>

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

          {/* ===== MOBILE — row 2: separated icon buttons, collapsible ===== */}
          <MobileNavPanel>
            {session?.user && (
              <p className="px-1 pb-1.5 text-[11px] font-semibold text-slate-500">
                Hai, {session.user.name?.split(" ")[0]}!
              </p>
            )}
            <div className={`grid gap-2 ${session?.user ? "grid-cols-4" : "grid-cols-3"}`}>
              {session?.user ? (
                <Link href="/orders" className={TILE}>
                  <AppIcon name="pesanan" size={22} />
                  <span>Pesanan</span>
                </Link>
              ) : (
                <Link href="/login" className={TILE}>
                  <AppIcon name="akun" size={22} />
                  <span>Masuk</span>
                </Link>
              )}

              <Link href="/wishlist" className={TILE}>
                <span className="relative">
                  <AppIcon name="wishlist" size={22} />
                  <CartBadge count={wishlistCount} variant="bubble" />
                </span>
                <span>Wishlist</span>
              </Link>

              <Link href="/cart" className={TILE}>
                <span className="relative">
                  <AppIcon name="cart" size={22} />
                  <CartBadge count={cartCount} variant="bubble" />
                </span>
                <span>{cartCount > 0 ? formatIDR(cartTotal) : "Keranjang"}</span>
              </Link>

              {session?.user && (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className={`${TILE} w-full cursor-pointer text-bimbi-pink`}>
                    <AppIcon name="akun" size={22} />
                    <span>Keluar</span>
                  </button>
                </form>
              )}
            </div>
          </MobileNavPanel>

          {/* Search — shared, full width */}
          <form
            id="tour-search"
            action="/search"
            className="mt-2 md:mt-3 w-full flex items-center rounded-full bg-slate-100 border border-slate-200 overflow-hidden"
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
              className="flex-1 px-4 py-2.5 md:py-3 text-sm text-bimbi-ink outline-none placeholder:text-slate-400 bg-transparent"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="m-1 h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors btn-press"
            >
              <AppIcon name="search" size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* ROW 3 — light grey category strip (sliding, with arrows) */}
      <div className="w-full bg-bimbi-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center">
          <CategoryNav categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))} />
        </div>
      </div>
    </header>
  );
}
