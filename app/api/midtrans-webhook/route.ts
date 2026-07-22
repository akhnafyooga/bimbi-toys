import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyNotificationSignature } from "@/lib/midtrans";

// Configure this URL in your Midtrans Dashboard → Settings → Configuration →
// Payment Notification URL, e.g. https://yourdomain.com/api/midtrans-webhook

export async function POST(req: Request) {
  const body = await req.json();

  console.log("[midtrans-webhook] Received notification:", JSON.stringify(body, null, 2));

  const valid = verifyNotificationSignature({
    order_id: body.order_id,
    status_code: body.status_code,
    gross_amount: body.gross_amount,
    signature_key: body.signature_key,
  });

  console.log("[midtrans-webhook] Signature valid:", valid);

  if (!valid) {
    console.log("[midtrans-webhook] Signature mismatch — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({ where: { id: body.order_id } });
  console.log("[midtrans-webhook] Order lookup for id:", body.order_id, "→", order ? `found (status: ${order.status})` : "NOT FOUND");

  if (!order) {
    console.log("[midtrans-webhook] Test notification or unknown order");
    return NextResponse.json({ ok: true });
  }

  let status = order.status;
  if (body.transaction_status === "settlement" || body.transaction_status === "capture") {
    status = "PAID";
  } else if (body.transaction_status === "expire") {
    status = "EXPIRED";
  } else if (body.transaction_status === "cancel" || body.transaction_status === "deny") {
    status = "CANCELLED";
  }

  console.log("[midtrans-webhook] transaction_status:", body.transaction_status, "→ new order status:", status);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : order.paidAt,
    },
  });

  console.log("[midtrans-webhook] Order updated successfully");

  return NextResponse.json({ ok: true });
}

