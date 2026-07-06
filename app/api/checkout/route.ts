import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQrisTransaction } from "@/lib/midtrans";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json() as {
    fulfillment: "PICKUP" | "SHIPPING";
    storeId?: string;
    addressId?: string;
    shippingCourier?: string;
    shippingCost?: number;
  };

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Keranjang kamu masih kosong." }, { status: 400 });
  }

  if (body.fulfillment === "PICKUP" && !body.storeId) {
    return NextResponse.json({ error: "Pilih dulu toko untuk ambil barang." }, { status: 400 });
  }
  if (body.fulfillment === "SHIPPING" && !body.addressId) {
    return NextResponse.json({ error: "Pilih atau tambahkan alamat pengiriman dulu." }, { status: 400 });
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shippingCost = body.fulfillment === "SHIPPING" ? body.shippingCost ?? 0 : 0;
  const total = subtotal + shippingCost;

  const orderNumber = `BIMBI-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      fulfillment: body.fulfillment,
      storeId: body.fulfillment === "PICKUP" ? body.storeId : undefined,
      addressId: body.fulfillment === "SHIPPING" ? body.addressId : undefined,
      shippingCourier: body.shippingCourier,
      shippingCost,
      subtotal,
      total,
      items: {
        create: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.product.price,
        })),
      },
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const { transactionId, qrisUrl } = await createQrisTransaction({
    orderId: order.id,
    grossAmount: total,
    customerName: user!.name,
    customerEmail: user!.email,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { midtransOrderId: transactionId, qrisUrl },
  });

  // clear the cart now that the order has been placed
  await prisma.cartItem.deleteMany({ where: { userId } });

  return NextResponse.json({ orderId: order.id, orderNumber, qrisUrl, total });
}
