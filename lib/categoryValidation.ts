export type CategoryInput = { name?: string; slug?: string; emoji?: string };

export function validateCategoryInput(body: CategoryInput) {
  const name = String(body.name ?? "").trim();
  const emoji = String(body.emoji ?? "").trim();

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Nama kategori belum diisi.";

  return { name, emoji, errors };
}
