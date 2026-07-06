import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: (session.user as { id: string }).id },
  });
  return NextResponse.json(addresses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Kamu perlu masuk dulu." }, { status: 401 });

  const data = await req.json();
  const address = await prisma.address.create({
    data: { ...data, userId: (session.user as { id: string }).id },
  });
  return NextResponse.json(address);
}
