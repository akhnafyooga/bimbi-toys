import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import CategoryNav from "@/components/CategoryNav";
import CartBadge from "@/components/CartBadge";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";
import NavPanel from "@/components/NavPanel";
import HeaderScrollState from "@/components/HeaderScrollState";
import PendingLink from "@/components/PendingLink";
import SearchSuggest from "@/components/SearchSuggest";

// Shared look for one nav tile: icon on top, label underneath. `relative` so a
// PendingLink overlay can anchor to the tile (harmless on the plain buttons).
const TILE =
  "relative flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 px-1 text-[11px] font-bold text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

// Icon-only version of TILE, used in the pinned search row while scrolled.
const COMPACT =
  "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

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
    <header
      data-sticky-header
      className="sticky top-0 w-full z-50 flex flex-col shadow-sm"
    >
      <HeaderScrollState />
      {/* z-10 lifts this whole layer above the category strip inside the
          header's stacking context, so the search suggest dropdown (trapped
          here by clouds-bg's isolation) paints over it. */}
      <div className="clouds-bg z-10 w-full text-bimbi-ink border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 md:py-4">

          {/* Only the logo folds away on scroll. The tile row below stays put so
              Pesanan / Wishlist / Keranjang remain reachable from anywhere. */}
          <div className="header-collapse">
          <div>

          {/* ===== ROW 1 — logo on its own line, all screen sizes ===== */}
          <div className="flex justify-center pt-0.5 pb-1">
            <Link href="/" className="chip-spring flex items-center" title="Bimbi Toys">
              <BrandLogo variant="mark" height={36} heightClass="h-8 md:h-10" />
            </Link>
          </div>

          </div>
          </div>

          {/* ===== ROW 2 — separated icon buttons, collapsible, all screen sizes ===== */}
          <div className="nav-tiles">
          <NavPanel>
            <div className="mx-auto w-full max-w-2xl">
              {session?.user && (
                <p className="px-1 pb-1.5 text-[11px] font-semibold text-slate-700">
                  Hai, {session.user.name?.split(" ")[0]}!
                </p>
              )}
              <div className="grid gap-2 grid-cols-4">
                {!session?.user && (
                  <PendingLink href="/login" label="Masuk" overlayLabel={null} className={TILE}>
                    <AppIcon name="akun" size={22} />
                    <span>Masuk</span>
                  </PendingLink>
                )}

                {/* Always shown: /orders sends guests to login and back, so
                    hiding it just made the button look like it vanished. */}
                <PendingLink href="/orders" label="Pesanan Saya" overlayLabel={null} className={TILE}>
                  <AppIcon name="pesanan" size={22} />
                  <span>Pesanan</span>
                </PendingLink>

                <PendingLink href="/wishlist" label="Wishlist" overlayLabel={null} className={TILE}>
                  <span className="relative">
                    <AppIcon name="wishlist" size={22} />
                    <CartBadge count={wishlistCount} variant="bubble" />
                  </span>
                  <span>Wishlist</span>
                </PendingLink>

                <PendingLink href="/cart" label="Keranjang" overlayLabel={null} className={TILE} id="tour-cart" dataTour="cart">
                  <span className="relative">
                    <AppIcon name="cart" size={22} />
                    <CartBadge count={cartCount} variant="bubble" />
                  </span>
                  <span>{cartCount > 0 ? formatIDR(cartTotal) : "Keranjang"}</span>
                </PendingLink>

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
          </div>

          {/* Search row — always visible. Once the tile menu auto-hides on
              scroll, the compact shortcuts below appear beside the search so
              Pesanan / Wishlist / Keranjang never become unreachable. */}
          <div className="mt-2 md:mt-3 header-search flex items-center gap-2">
          <SearchSuggest categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))} />

          {/* Shown only while scrolled (CSS keys off the header's data-scrolled),
              so it never duplicates the tiles when the menu is open. */}
          <div className="header-compact items-center gap-1 shrink-0">
            {!session?.user && (
              <PendingLink href="/login" label="Masuk" title="Masuk" overlayLabel={null} className={COMPACT}>
                <AppIcon name="akun" size={20} />
              </PendingLink>
            )}
            <PendingLink href="/orders" label="Pesanan Saya" title="Pesanan Saya" overlayLabel={null} className={COMPACT}>
              <AppIcon name="pesanan" size={20} />
            </PendingLink>
            <PendingLink href="/wishlist" label="Wishlist" title="Wishlist" overlayLabel={null} className={COMPACT}>
              <span className="relative">
                <AppIcon name="wishlist" size={20} />
                <CartBadge count={wishlistCount} variant="bubble" />
              </span>
            </PendingLink>
            {/* Same data-tour hook as the tile: findVisible() picks whichever
                of the two is actually rendered, so the tutorial highlights the
                control the user can currently see. */}
            <PendingLink href="/cart" label="Keranjang" title="Keranjang" overlayLabel={null} className={COMPACT} dataTour="cart">
              <span className="relative">
                <AppIcon name="cart" size={20} />
                <CartBadge count={cartCount} variant="bubble" />
              </span>
            </PendingLink>
          </div>
          </div>
        </div>
      </div>

      {/* ROW 3 — light grey category strip (sliding, with arrows).
          Folds away on scroll like the logo, leaving a thin white rule under
          the search bar. */}
      <div className="header-categories w-full bg-bimbi-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center w-full min-w-0">
          <CategoryNav categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))} />
        </div>
      </div>
    </header>
  );
}
