import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import CheckoutClient from "@/components/CheckoutClient";
import { getUserDiscount } from "@/lib/discount";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/checkout");
  const userId = (session.user as { id: string }).id;

  const [cartItems, stores, user] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    }),
    prisma.storeLocation.findMany({ orderBy: { city: "asc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
  ]);

  if (cartItems.length === 0) redirect("/cart");

  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Map each store's raw phone into the normalized wa.me form the checkout needs
  // to build the WhatsApp order chat. Stores without a usable number get "".
  const storeContacts = stores.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    address: s.address,
    whatsapp: normalizePhone(s.phone ?? "") ?? "",
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl text-bimbi-pink-dark mb-2">Konfirmasi Pesanan</h1>
      <p className="text-sm text-bimbi-ink/60 mb-6">
        Pesananmu diteruskan ke WhatsApp toko untuk dicek stok &amp; cara pembayarannya.
      </p>
      <CheckoutClient
        cartItems={cartItems}
        subtotal={subtotal}
        stores={storeContacts}
        userPhone={user?.phone ?? null}
        discountPercent={await getUserDiscount()}
      />
    </div>
  );
}
