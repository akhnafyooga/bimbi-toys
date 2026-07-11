import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: (session.user as { id: string }).id },
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

// Toggle: adds if not present, removes if present
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const { productId } = await req.json();
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ wishlisted: false });
  } else {
    await prisma.wishlistItem.create({ data: { userId, productId } });
    return NextResponse.json({ wishlisted: true });
  }
}
