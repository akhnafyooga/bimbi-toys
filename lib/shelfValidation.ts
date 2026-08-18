export type ShelfInput = {
  name?: string;
  code?: string;
  storeId?: string;
  categoryId?: string;
  description?: string;
  image?: string;
  position?: number | string;
  active?: boolean;
};

export type ShelfCategoryInput = {
  name?: string;
  position?: number | string;
};

export type ProductShelfListInput = {
  products?: { productId?: string }[];
};

export function validateShelfInput(body: ShelfInput) {
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  const storeId = String(body.storeId ?? "").trim();
  const categoryId = String(body.categoryId ?? "").trim();
  const description = String(body.description ?? "").trim();
  const image = String(body.image ?? "").trim();
  const position = Number(body.position ?? 0);
  const active = body.active !== false;

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Nama rak belum diisi.";
  if (!code) errors.code = "Kode rak belum diisi.";
  if (!storeId) errors.storeId = "Pilih toko untuk rak ini.";
  if (!categoryId) errors.categoryId = "Pilih kategori rak.";
  if (!Number.isFinite(position) || position < 0 || !Number.isInteger(position)) {
    errors.position = "Urutan tampil harus angka bulat 0 atau lebih.";
  }

  return { name, code, storeId, categoryId, description, image, position, active, errors };
}

export function validateShelfCategoryInput(body: ShelfCategoryInput) {
  const name = String(body.name ?? "").trim();
  const position = Number(body.position ?? 0);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Nama kategori rak belum diisi.";
  if (!Number.isFinite(position) || position < 0 || !Number.isInteger(position)) {
    errors.position = "Urutan tampil harus angka bulat 0 atau lebih.";
  }

  return { name, position, errors };
}

export function validateProductShelfList(body: ProductShelfListInput) {
  const raw = Array.isArray(body.products) ? body.products : null;
  if (!raw) return { items: null as { productId: string }[] | null, error: "Daftar produk tidak valid." };

  const items: { productId: string }[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const productId = String(entry?.productId ?? "").trim();
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    items.push({ productId });
  }
  return { items, error: null };
}
