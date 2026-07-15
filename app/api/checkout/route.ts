import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQrisTransaction } from "@/lib/midtrans";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json() as {
    fulfillment: "PICKUP" | "SHIPPING" | "SELF_COURIER";
    storeId?: string;
    addressId?: string;
    shippingCourier?: string;
    shippingCost?: number;
    contactPhone?: string;
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
  // Buyer-arranged courier: needs the pickup store and a working WA number,
  // validated server-side — the UI check alone can't be trusted.
  let contactPhone: string | null = null;
  if (body.fulfillment === "SELF_COURIER") {
    if (!body.storeId) {
      return NextResponse.json({ error: "Pilih dulu toko tempat kurir mengambil barang." }, { status: 400 });
    }
    contactPhone = normalizePhone(body.contactPhone ?? "");
    if (!contactPhone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid. Contoh format: 0812-3456-7890." },
        { status: 400 }
      );
    }
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
      storeId: body.fulfillment !== "SHIPPING" ? body.storeId : undefined,
      addressId: body.fulfillment === "SHIPPING" ? body.addressId : undefined,
      contactPhone,
      shippingCourier: body.fulfillment === "SHIPPING" ? body.shippingCourier : undefined,
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

  // Remember the buyer's WA number on their profile so it pre-fills next time.
  if (contactPhone && !user?.phone) {
    await prisma.user.update({ where: { id: userId }, data: { phone: contactPhone } });
  }

  let transactionId: string;
  let qrisUrl: string | undefined;
  try {
    ({ transactionId, qrisUrl } = await createQrisTransaction({
      orderId: order.id,
      grossAmount: total,
      customerName: user!.name,
      customerEmail: user!.email,
    }));
  } catch (err) {
    // Payment gateway rejected/unreachable — remove the order we just created
    // so no orphan PENDING_PAYMENT row lingers, and keep the cart intact.
    await prisma.order.delete({ where: { id: order.id } });
    console.error("Midtrans charge failed:", err);

    // Surface the real Midtrans reason for configuration errors (bad/rejected
    // API keys → 401/403) so the store owner can fix their setup instead of
    // seeing a generic "try again" that never resolves.
    const mid = err as { httpStatusCode?: string | number; ApiResponse?: { status_message?: string } };
    const code = Number(mid?.httpStatusCode);
    const reason = mid?.ApiResponse?.status_message;
    if (code === 401 || code === 403) {
      return NextResponse.json(
        {
          error: `Pembayaran belum bisa diproses karena pengaturan Midtrans belum benar${
            reason ? ` (${reason})` : ""
          }. Periksa MIDTRANS_SERVER_KEY di server.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Pembayaran sedang tidak bisa diproses. Coba lagi sebentar lagi ya." },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { midtransOrderId: transactionId, qrisUrl },
  });

  // clear the cart now that the order has been placed
  await prisma.cartItem.deleteMany({ where: { userId } });

  return NextResponse.json({ orderId: order.id, orderNumber, qrisUrl, total });
}
