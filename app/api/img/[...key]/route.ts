import { getR2Object } from "@/lib/upload";

// Public image proxy: streams product images out of R2 through our own domain,
// so display never depends on the r2.dev host being reachable from the client
// (some Indonesian ISPs block r2.dev). Reads via the S3 endpoint server-side.
//
// Locked to known prefixes so it can't be used to read arbitrary keys.
// `shelves/` holds the physical shelf photos for "Lihat Ada Apa di Toko";
// `shelf-asks/` holds customer-cropped circles sent over WhatsApp.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");

  const allowed =
    objectKey.startsWith("products/") ||
    objectKey.startsWith("shelves/") ||
    objectKey.startsWith("shelf-asks/");
  if (!allowed || objectKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await getR2Object(objectKey);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
