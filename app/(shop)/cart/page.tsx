import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CartList from "@/components/CartList";
import { getUserDiscount } from "@/lib/discount";

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/cart");

  const items = await prisma.cartItem.findMany({
    where: { userId: (session.user as { id: string }).id },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  const discountPercent = await getUserDiscount();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-6">Keranjang Kamu</h1>
      <CartList items={items} discountPercent={discountPercent} />
    </div>
  );
}
