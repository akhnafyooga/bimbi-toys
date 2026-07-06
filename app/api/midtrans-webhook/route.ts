import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyNotificationSignature } from "@/lib/midtrans";

// Configure this URL in your Midtrans Dashboard → Settings → Configuration →
// Payment Notification URL, e.g. https://yourdomain.com/api/midtrans-webhook

export async function POST(req: Request) {
  const body = await req.json();

  const valid = verifyNotificationSignature({
    order_id: body.order_id,
    status_code: body.status_code,
    gross_amount: body.gross_amount,
    signature_key: body.signature_key,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({ where: { id: body.order_id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let status = order.status;
  if (body.transaction_status === "settlement" || body.transaction_status === "capture") {
    status = "PAID";
  } else if (body.transaction_status === "expire") {
    status = "EXPIRED";
  } else if (body.transaction_status === "cancel" || body.transaction_status === "deny") {
    status = "CANCELLED";
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : order.paidAt,
    },
  });

  return NextResponse.json({ ok: true });
}
