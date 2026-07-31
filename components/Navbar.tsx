import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import CategoryNav from "@/components/CategoryNav";
import CartBadge from "@/components/CartBadge";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";
import NavPanel from "@/components/NavPanel";

// Shared look for one nav tile: icon on top, label underneath.
const TILE =
  "flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 px-1 text-[11px] font-bold text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

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
    <header className="w-full z-50 flex flex-col">
      <div className="clouds-bg w-full text-bimbi-ink border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 md:py-4">

          {/* ===== ROW 1 — logo on its own line, all screen sizes ===== */}
          <div className="flex justify-center pt-0.5 pb-1">
            <Link href="/" className="chip-spring flex items-center" title="Bimbi Toys">
              <BrandLogo variant="mark" height={36} heightClass="h-8 md:h-10" />
            </Link>
          </div>

          {/* ===== ROW 2 — separated icon buttons, collapsible, all screen sizes ===== */}
          <NavPanel>
            <div className="mx-auto w-full max-w-2xl">
              {session?.user && (
                <p className="px-1 pb-1.5 text-[11px] font-semibold text-slate-700">
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

                <Link id="tour-cart" href="/cart" data-tour="cart" className={TILE}>
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
            </div>
          </NavPanel>

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
