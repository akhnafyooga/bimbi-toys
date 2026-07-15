import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, store: true, address: true },
  });

  if (!order || order.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  // Buyer-arranged courier: withhold the pickup store until staff mark the
  // order ready. The buyer can't book a courier early because the address
  // never reaches the browser — not even in the JSON.
  if (
    order.fulfillment === "SELF_COURIER" &&
    ["PENDING_PAYMENT", "PAID", "PACKED"].includes(order.status)
  ) {
    return NextResponse.json({ ...order, store: null });
  }

  return NextResponse.json(order);
}
