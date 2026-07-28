import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// "Harga spesial kenalan" — a per-user percentage off every item.
// Stored on User.discountPercent (0 = normal pricing).

/** Price after the user's discount, rounded to whole Rupiah. */
export function applyDiscount(price: number, percent: number): number {
  if (!percent || percent <= 0) return price;
  return Math.round(price * (1 - percent / 100));
}

/**
 * The signed-in user's discount percentage, or 0 for guests/normal customers.
 * Wrapped in React `cache` so several components in one render share a single
 * database round-trip.
 */
export const getUserDiscount = cache(async (): Promise<number> => {
  const session = await auth();
  if (!session?.user) return 0;
  const id = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { discountPercent: true },
  });
  return user?.discountPercent ?? 0;
});
