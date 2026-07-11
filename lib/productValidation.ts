export type ProductInput = {
  name?: string;
  slug?: string;
  description?: string;
  price?: number | string;
  compareAtPrice?: number | string | null;
  stock?: number | string;
  minAge?: number | string | null;
  categoryId?: string;
  featured?: boolean;
  images?: { url: string; alt?: string }[];
};

export function validateProductInput(body: ProductInput) {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const price = Number(body.price);
  const stock = Number(body.stock ?? 0);
  const categoryId = String(body.categoryId ?? "");
  const compareAtPrice =
    body.compareAtPrice != null && body.compareAtPrice !== "" ? Number(body.compareAtPrice) : null;
  const minAge = body.minAge != null && body.minAge !== "" ? Number(body.minAge) : null;
  const featured = Boolean(body.featured);
  const images = Array.isArray(body.images) ? body.images : [];

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Nama produk belum diisi.";
  if (!description) errors.description = "Deskripsi belum diisi.";
  if (!categoryId) errors.categoryId = "Pilih kategori dulu.";
  if (!Number.isFinite(price) || price <= 0) errors.price = "Harga harus lebih dari 0.";
  if (!Number.isFinite(stock) || stock < 0) errors.stock = "Stok tidak boleh negatif.";
  if (compareAtPrice != null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price)) {
    errors.compareAtPrice = "Harga coret harus lebih besar dari harga jual.";
  }

  return { name, description, price, stock, categoryId, compareAtPrice, minAge, featured, images, errors };
}
