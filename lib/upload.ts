import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

// Swappable product-photo storage.
//
// Default (dev, and fine for a single-server deploy): saves to /public/uploads/products
// and returns a local URL. This does NOT persist on serverless hosts (Vercel wipes
// local disk on every deploy), so production needs Cloudinary.
//
// To switch to Cloudinary: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and
// CLOUDINARY_API_SECRET in your environment — this module then automatically
// uploads there instead. No other code changes needed. See DEPLOYMENT.md.

export type UploadedImage = { url: string };

export class UploadValidationError extends Error {}

export function assertValidImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadValidationError("Format file harus JPG, PNG, atau WEBP.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new UploadValidationError("Ukuran file maksimal 5MB.");
  }
}

export async function uploadProductImage(file: File): Promise<UploadedImage> {
  assertValidImageFile(file);

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return uploadToCloudinary(file);
  }
  return uploadToLocalDisk(file);
}

async function uploadToLocalDisk(file: File): Promise<UploadedImage> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return { url: `/uploads/products/${filename}` };
}

// Uses Cloudinary's signed upload REST API directly (no SDK dependency needed).
// Not yet exercised against a live account — verify this path once real
// Cloudinary credentials are configured (see DEPLOYMENT.md "Production image storage").
async function uploadToCloudinary(file: File): Promise<UploadedImage> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const folder = "bimbi-toys/products";
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("Gagal mengunggah gambar ke Cloudinary.");
  }

  const data = (await res.json()) as { secure_url: string };
  return { url: data.secure_url };
}
