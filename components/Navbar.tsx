import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import CategoryNav from "@/components/CategoryNav";
import CartBadge from "@/components/CartBadge";
import BrandLogo from "@/components/BrandLogo";
import AppIcon from "@/components/AppIcon";
import NavPanel from "@/components/NavPanel";
import PendingLink from "@/components/PendingLink";
import SearchSuggest from "@/components/SearchSuggest";

// Shared look for one nav tile inside the Menu dropdown: icon on top, label
// underneath. `relative` so a PendingLink overlay can anchor to the tile.
// No background of its own — the tiles sit directly on the dropdown's one
// solid white panel (just a light wash on hover).
const TILE =
  "relative flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1 text-[11px] font-bold text-bimbi-ink hover:bg-bimbi-cream transition-colors chip-spring";

// Icon shortcut in the header's single row.
const COMPACT =
  "relative glass-chip flex h-9 w-9 items-center justify-center rounded-full text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

// Same shortcut, but only from sm up — on phones the dropdown carries these.
const COMPACT_DESKTOP =
  "relative glass-chip hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-bimbi-ink hover:border-bimbi-pink/50 transition-colors chip-spring";

// Compact-first header: ONE slim row (logo | search | shortcuts) plus the
// category strip. The old logo/tile rows and their scroll-fold animation are
// gone — the account tiles live in the Menu dropdown (NavPanel) instead, so
// the header costs the same ~90px everywhere instead of ~240px on the
// homepage and ~130px elsewhere.
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
  const categoryList = categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));

  return (
    <header
      data-sticky-header
      className="sticky top-0 w-full z-50 flex flex-col shadow-sm"
    >
      {/* z-10 lifts this whole layer above the category strip inside the
          header's stacking context, so the search suggest dropdown and the
          menu dropdown (both trapped here by the glass bar's stacking
          context — backdrop-filter isolates) paint over it. */}
      <div className="glass-bar z-10 w-full text-bimbi-ink border-b border-white/60">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2">
          {/* ===== ONE slim row: logo | search | shortcuts ===== */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="chip-spring flex shrink-0 items-center" title="Bimbi Toys">
              <BrandLogo variant="mark" height={32} />
            </Link>

            <SearchSuggest categories={categoryList} />

            {/* Shortcuts — cart and Menu on every screen; the rest
                desktop-only (they stay in the dropdown on mobile). */}
            <div className="flex shrink-0 items-center gap-1">
              {!session?.user && (
                <PendingLink href="/login" label="Masuk" title="Masuk" overlayLabel={null} className={COMPACT_DESKTOP}>
                  <AppIcon name="akun" size={20} />
                </PendingLink>
              )}
              <PendingLink href="/orders" label="Pesanan Saya" title="Pesanan Saya" overlayLabel={null} className={COMPACT_DESKTOP}>
                <AppIcon name="pesanan" size={20} />
              </PendingLink>
              <PendingLink href="/wishlist" label="Wishlist" title="Wishlist" overlayLabel={null} className={COMPACT_DESKTOP}>
                <span className="relative">
                  <AppIcon name="wishlist" size={20} />
                  <CartBadge count={wishlistCount} variant="bubble" />
                </span>
              </PendingLink>
              {/* The tour's cart step targets [data-tour="cart"] — now always
                  visible on every screen size, no scroll-fold caveats. */}
              <PendingLink href="/cart" label="Keranjang" title="Keranjang" overlayLabel={null} className={COMPACT} id="tour-cart" dataTour="cart">
                <span className="relative">
                  <AppIcon name="cart" size={20} />
                  <CartBadge count={cartCount} variant="bubble" />
                </span>
              </PendingLink>

              {/* Menu dropdown: greeting + account tiles. Children are
                  server-rendered (the sign-out server action rides along). */}
              <NavPanel>
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

                  <PendingLink href="/cart" label="Keranjang" overlayLabel={null} className={TILE}>
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
              </NavPanel>
            </div>
          </div>
        </div>
      </div>

      {/* Category strip — frosted, sliding, with arrows. The second and
          final header row; it no longer folds away on scroll. */}
      <div className="glass-bar w-full border-b border-white/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center w-full min-w-0">
          <CategoryNav categories={categoryList} />
        </div>
      </div>
    </header>
  );
}
