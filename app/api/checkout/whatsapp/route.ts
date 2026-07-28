import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { applyDiscount } from "@/lib/discount";

// WhatsApp checkout: records the order as a pending request, then the client
// opens a wa.me chat so the store can confirm stock + payment by hand. No
// payment gateway is involved — the Midtrans route (/api/checkout) stays in the
// repo but is no longer wired into the flow.
//
// The order is saved as PENDING_PAYMENT ("Menunggu Pembayaran") — the closest
// existing status for "placed, awaiting the store's WhatsApp confirmation".
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = (await req.json()) as {
    fulfillment: "PICKUP" | "SELF_COURIER";
    storeId?: string;
    contactPhone?: string;
  };

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });
  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Keranjang kamu masih kosong." }, { status: 400 });
  }
  if (!body.storeId) {
    return NextResponse.json({ error: "Pilih dulu tokonya ya." }, { status: 400 });
  }

  // Buyer-arranged courier still captures a WA number so it lands on the order.
  let contactPhone: string | null = null;
  if (body.fulfillment === "SELF_COURIER") {
    contactPhone = normalizePhone(body.contactPhone ?? "");
    if (!contactPhone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid. Contoh format: 0812-3456-7890." },
        { status: 400 }
      );
    }
  }

  // "Harga spesial kenalan" is resolved server-side — never trust a client total.
  const buyer = await prisma.user.findUnique({
    where: { id: userId },
    select: { discountPercent: true, phone: true },
  });
  const discountPercent = buyer?.discountPercent ?? 0;
  const unitPrice = (price: number) => applyDiscount(price, discountPercent);

  const subtotal = cartItems.reduce((sum, i) => sum + unitPrice(i.product.price) * i.quantity, 0);
  // Ongkir tidak dihitung di sini — diselesaikan lewat chat / bayar ke kurir.
  const total = subtotal;

  const orderNumber = `BIMBI-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      fulfillment: body.fulfillment,
      storeId: body.storeId,
      contactPhone,
      subtotal,
      total,
      status: "PENDING_PAYMENT",
      items: {
        create: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: unitPrice(i.product.price),
        })),
      },
    },
  });

  // Remember the buyer's WA number on their profile so it pre-fills next time.
  if (contactPhone) {
    if (!buyer?.phone) {
      await prisma.user.update({ where: { id: userId }, data: { phone: contactPhone } });
    }
  }

  // Clear the cart now that the order is recorded.
  await prisma.cartItem.deleteMany({ where: { userId } });

  return NextResponse.json({ orderId: order.id, orderNumber, total });
}
