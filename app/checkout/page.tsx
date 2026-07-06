import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/CheckoutClient";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/checkout");
  const userId = (session.user as { id: string }).id;

  const [cartItems, stores, addresses] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    }),
    prisma.storeLocation.findMany({ orderBy: { city: "asc" } }),
    prisma.address.findMany({ where: { userId } }),
  ]);

  if (cartItems.length === 0) redirect("/cart");

  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-6">Checkout 🎁</h1>
      <CheckoutClient cartItems={cartItems} subtotal={subtotal} stores={stores} addresses={addresses} />
    </div>
  );
}
