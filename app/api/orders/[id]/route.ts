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

  return NextResponse.json(order);
}
