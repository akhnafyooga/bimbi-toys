import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const items = await prisma.cartItem.findMany({
    where: { userId: (session.user as { id: string }).id },
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const { productId, quantity } = await req.json();
  const userId = (session.user as { id: string }).id;

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: Math.max(1, quantity ?? 1) },
    create: { userId, productId, quantity: Math.max(1, quantity ?? 1) },
    include: { product: { include: { images: true } } },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const { productId } = await req.json();
  const userId = (session.user as { id: string }).id;

  await prisma.cartItem.deleteMany({ where: { userId, productId } });
  return NextResponse.json({ ok: true });
}
