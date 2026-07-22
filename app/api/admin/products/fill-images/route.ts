import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backfillMissingImages } from "@/lib/productImages";

// Backfilling calls Serper + downloads + uploads per product, so give the
// function room. (Vercel Hobby caps this at 10s regardless; Pro honours 60s.)
export const maxDuration = 60;

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!process.env.SERPER_API_KEY) {
    return NextResponse.json({ error: "SERPER_API_KEY belum diset di server." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20);

  try {
    const summary = await backfillMissingImages(limit);
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengisi gambar otomatis." }, { status: 500 });
  }
}
