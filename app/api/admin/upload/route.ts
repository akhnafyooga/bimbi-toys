import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { uploadProductImage, UploadValidationError } from "@/lib/upload";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Tidak ada file yang dikirim." }, { status: 400 });
  }

  try {
    const { url } = await uploadProductImage(file);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Gagal mengunggah foto. Coba lagi ya." }, { status: 500 });
  }
}
