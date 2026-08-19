import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

// Swappable product-photo storage. Backend priority:
//   1. Cloudflare R2  (if R2_* env vars set) — production; served via r2.dev / CDN
//   2. Cloudinary     (if CLOUDINARY_* set)
//   3. Local disk     (dev only; NOT persisted on serverless hosts like Vercel)
//
// R2 is S3-compatible, so we talk to it with the AWS S3 client. Uploaded objects
// get an immutable, year-long Cache-Control and a random key, so their public
// URLs are safe to cache at the edge forever.

export type UploadedImage = { url: string };

export class UploadValidationError extends Error {}

// Some tools report JPEG as the non-standard "image/jpg" — normalize it to
// the canonical MIME so stored objects (and their Content-Type when served)
// are always standard. Everything else passes through unchanged.
function canonicalContentType(contentType: string) {
  return contentType === "image/jpg" ? "image/jpeg" : contentType;
}

export function assertValidImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadValidationError("Format file harus JPG, PNG, atau WEBP.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new UploadValidationError("Ukuran file maksimal 5MB.");
  }
}

function extFromContentType(contentType: string) {
  return contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
}

// ---- Public entry points -------------------------------------------------

// Storage folders. "products" is the default; "shelves" holds the physical
// shelf photos for the "Lihat Ada Apa di Toko" feature; "shelf-asks" holds
// customer-cropped "Penasaran sama produk ini?" circles sent to store WhatsApp.
export type UploadFolder = "products" | "shelves" | "shelf-asks";

// Manual admin upload path (a user-selected File).
export async function uploadProductImage(file: File, folder: UploadFolder = "products"): Promise<UploadedImage> {
  assertValidImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadImageBytes(buffer, canonicalContentType(file.type), folder);
}

// Raw-bytes path, used by the auto-fetch pipeline (lib/productImages.ts), which
// downloads a remote image and hands us the buffer + content-type.
export async function uploadImageBytes(
  buffer: Buffer,
  contentType: string,
  folder: UploadFolder = "products"
): Promise<UploadedImage> {
  const ct = canonicalContentType(contentType);
  if (!ALLOWED_IMAGE_TYPES.includes(ct)) {
    throw new UploadValidationError("Format gambar harus JPG, PNG, atau WEBP.");
  }
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new UploadValidationError("Ukuran gambar maksimal 5MB.");
  }
  if (isR2Configured()) return uploadToR2(buffer, ct, folder);
  if (isCloudinaryConfigured()) return uploadToCloudinary(buffer, ct);
  return uploadToLocalDisk(buffer, ct, folder);
}

// ---- Cloudflare R2 -------------------------------------------------------

let r2Client: S3Client | null = null;

export function isR2Configured() {
  // Images are served through our own /api/img proxy, so no public bucket URL is
  // needed — just the S3 credentials + bucket.
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

async function uploadToR2(buffer: Buffer, contentType: string, folder: UploadFolder): Promise<UploadedImage> {
  const key = `${folder}/${crypto.randomUUID()}.${extFromContentType(contentType)}`;
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  // Serve through our own /api/img proxy rather than the raw r2.dev public URL:
  // r2.dev is filtered by some Indonesian ISPs, but the S3 endpoint we read from
  // (r2.cloudflarestorage.com) is not. Same-origin URLs also need no remotePatterns.
  return { url: `/api/img/${key}` };
}

// Fetch an object's bytes back from R2 (used by the /api/img proxy route).
export async function getR2Object(key: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (!isR2Configured()) return null;
  try {
    const obj = await getR2Client().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
    );
    if (!obj.Body) return null;
    const bytes = await obj.Body.transformToByteArray();
    // Copy into a plain ArrayBuffer so it's an unambiguous Response BodyInit.
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return { body, contentType: obj.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

// ---- Local disk (dev only) ----------------------------------------------

async function uploadToLocalDisk(buffer: Buffer, contentType: string, folder: UploadFolder): Promise<UploadedImage> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extFromContentType(contentType)}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/${folder}/${filename}` };
}

// ---- Cloudinary ----------------------------------------------------------

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

// Uses Cloudinary's signed upload REST API directly (no SDK dependency needed).
// Not yet exercised against a live account — verify this path once real
// Cloudinary credentials are configured (see DEPLOYMENT.md "Production image storage").
async function uploadToCloudinary(buffer: Buffer, contentType: string): Promise<UploadedImage> {
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
  form.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }));
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
