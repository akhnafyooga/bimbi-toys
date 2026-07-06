import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export default async function Navbar() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [cartCount, wishlistCount] = userId
    ? await Promise.all([
        prisma.cartItem.count({ where: { userId } }),
        prisma.wishlistItem.count({ where: { userId } }),
      ])
    : [0, 0];

  return (
    <header className="sticky top-0 z-50 bg-bimbi-cream/95 backdrop-blur border-b-4 border-bimbi-pink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <Image
                      src="/logo.png"
                      alt="Bimbi Toys"
                      width={400}
                      height={160}
                      className="mx-auto h-20 w-auto"
                      priority
                    />
        </Link>

        <form action="/search" className="hidden md:flex flex-1 max-w-md">
          <input
            type="text"
            name="q"
            placeholder="Cari mainan favoritmu..."
            className="w-full rounded-full border-2 border-bimbi-sky/40 bg-white px-4 py-2 text-sm focus:outline-none focus:border-bimbi-sky placeholder:text-bimbi-ink/40"
          />
        </form>

        <nav className="flex items-center gap-3 sm:gap-5 ml-auto">
          <Link href="/wishlist" className="relative text-2xl hover:scale-110 transition-transform" title="Wishlist">
            💖
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-bimbi-grape text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link href="/cart" className="relative text-2xl hover:scale-110 transition-transform" title="Keranjang">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-bimbi-pink text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-semibold">
                Hai, {session.user.name?.split(" ")[0]}! 👋
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-sm font-bold text-bimbi-grape hover:underline">Keluar</button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-bimbi-pink px-4 py-2 text-sm font-bold text-white hover:bg-bimbi-pink-dark transition-colors shadow-[0_3px_0_var(--color-bimbi-pink-dark)] active:translate-y-[2px] active:shadow-none"
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
