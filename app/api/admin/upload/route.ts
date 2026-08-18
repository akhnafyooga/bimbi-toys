import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { uploadProductImage, UploadValidationError, type UploadFolder } from "@/lib/upload";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Tidak ada file yang dikirim." }, { status: 400 });
  }

  // Optional folder so shelf photos land beside product photos, not among them.
  const requestedFolder = String(formData.get("folder") ?? "products");
  const folder: UploadFolder = requestedFolder === "shelves" ? "shelves" : "products";

  try {
    const { url } = await uploadProductImage(file, folder);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Gagal mengunggah foto. Coba lagi ya." }, { status: 500 });
  }
}
