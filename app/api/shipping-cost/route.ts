import { NextResponse } from "next/server";
import { getShippingOptions } from "@/lib/shipping";

export async function POST(req: Request) {
  const { city, weightGrams } = await req.json();
  if (!city) return NextResponse.json({ error: "Kota tujuan wajib diisi." }, { status: 400 });

  const options = await getShippingOptions(city, weightGrams ?? 1000);
  return NextResponse.json(options);
}
