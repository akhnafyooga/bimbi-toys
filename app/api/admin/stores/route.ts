import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { validateStoreInput, type StoreInput } from "@/lib/storeValidation";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const stores = await prisma.storeLocation.findMany({
    include: { _count: { select: { stock: true, orders: true } } },
    orderBy: { city: "asc" },
  });

  return NextResponse.json({ stores });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as StoreInput;
  const { name, city, address, phone, lat, lng, errors } = validateStoreInput(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Ada isian yang belum benar.", fields: errors }, { status: 400 });
  }

  const store = await prisma.storeLocation.create({
    data: { name, city, address, phone: phone || null, lat, lng },
  });

  return NextResponse.json({ store });
}
