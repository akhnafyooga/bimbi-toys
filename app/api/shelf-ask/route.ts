import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadProductImage, UploadValidationError } from "@/lib/upload";

// "Penasaran sama produk ini?" — public endpoint that stores the customer's
// circled crop of a shelf photo. The WhatsApp message only carries text, so
// the crop is uploaded here and its URL goes into the chat instead. Same
// storage pipeline (R2 → Cloudinary → local disk) and validation as admin
// uploads; the extra rate limit keeps the public surface cheap to abuse.

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi dalam satu jam ya." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const shelfId = String(formData.get("shelfId") ?? "");
  const file = formData.get("file");
  if (!shelfId || !(file instanceof File)) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  // Only crops of a real, customer-visible shelf are accepted.
  const shelf = await prisma.shelf.findUnique({ where: { id: shelfId }, select: { active: true } });
  if (!shelf || !shelf.active) {
    return NextResponse.json({ error: "Rak tidak ditemukan." }, { status: 404 });
  }

  try {
    const { url } = await uploadProductImage(file, "shelf-asks");
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Gagal mengunggah. Coba lagi ya." }, { status: 500 });
  }
}
