import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { getNextStatus } from "@/lib/orderStatus";
import type { OrderStatus } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      user: true,
      store: true,
      address: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as { status?: OrderStatus };
  const allowed = getNextStatus(order.status, order.fulfillment);

  // Staff can only advance to the single next step in the fulfillment flow —
  // this also prevents ever touching payment statuses (PAID/PENDING_PAYMENT),
  // which only the Midtrans webhook is allowed to set.
  if (!allowed || allowed.next !== body.status) {
    return NextResponse.json(
      { error: "Perubahan status ini tidak diperbolehkan dari status pesanan saat ini." },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({ where: { id }, data: { status: allowed.next } });
  return NextResponse.json({ order: updated });
}
