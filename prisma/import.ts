// Bulk product importer for Bimbi Toys.
//
// Fill in docs/product-import-template.csv (or any CSV with the same columns),
// then run:
//     npm run db:import -- path/to/your-products.csv
//
// Columns (header row required):
//   name          required  product name
//   description   required  product description
//   price         required  selling price in Rupiah, digits only (e.g. 150000)
//   compareAtPrice optional "coret" price shown struck-through; blank = none
//   stock         optional  quantity available (default 0)
//   category      required  category NAME (created automatically if new)
//   featured      optional  true/false — show on the featured shelf (default false)
//   imageUrls     optional  one or more image URLs separated by "|"
//
// Existing products (matched by generated slug) are skipped, not overwritten,
// so re-running is safe. Works against whatever DATABASE_URL points at.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../lib/slug";

const prisma = new PrismaClient();

/** Minimal RFC-4180 CSV parser: handles quoted fields, commas/newlines in
 *  quotes, and "" escapes. Returns an array of row objects keyed by header. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

async function main() {
  // First non-flag argument is the CSV path; --dry-run validates without any DB writes.
  const dryRun = process.argv.includes("--dry-run");
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Pemakaian: npm run db:import -- path/ke/produk.csv [--dry-run]");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length === 0) {
    console.error("File CSV kosong atau tidak ada baris data.");
    process.exit(1);
  }

  // Dry run: parse + validate the file only, never touch the database. Safe to
  // run against any DATABASE_URL — reports what a real import would create/skip.
  if (dryRun) {
    let ok = 0, bad = 0, dupInFile = 0;
    const seen = new Set<string>();
    const cats = new Set<string>();
    for (const [i, r] of rows.entries()) {
      const line = i + 2;
      const name = r.name?.trim();
      const description = r.description?.trim();
      const price = Number(r.price);
      const category = r.category?.trim();
      if (!name || !description || !category || !Number.isFinite(price) || price <= 0) {
        bad++;
        if (bad <= 12) console.warn(`  ⚠ Baris ${line}: dilewati — name/description/category/price wajib & price > 0.`);
        continue;
      }
      const slug = slugify(name);
      if (seen.has(slug)) dupInFile++;
      else seen.add(slug);
      cats.add(category);
      ok++;
    }
    console.log(`\n🔎 DRY RUN — ${rows.length} baris diperiksa (tanpa menulis ke database):`);
    console.log(`   valid (akan dibuat)     : ${ok}`);
    console.log(`   tidak valid (dilewati)  : ${bad}`);
    console.log(`   slug ganda dalam file   : ${dupInFile}`);
    console.log(`   kategori unik           : ${cats.size} -> ${[...cats].sort().join(", ")}`);
    return;
  }

  // Cache categories by lowercased name so we only create each one once.
  const categoryCache = new Map<string, string>();
  async function categoryId(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    categoryCache.set(key, cat.id);
    return cat.id;
  }

  let created = 0, skipped = 0, failed = 0;
  console.log(`🧸 Mengimpor ${rows.length} produk dari ${file}...\n`);

  for (const [i, r] of rows.entries()) {
    const line = i + 2; // +1 header, +1 to be 1-indexed
    try {
      const name = r.name?.trim();
      const description = r.description?.trim();
      const price = Number(r.price);
      const category = r.category?.trim();

      if (!name || !description || !category || !Number.isFinite(price) || price <= 0) {
        console.warn(`  ⚠ Baris ${line}: dilewati — name/description/category/price wajib & price > 0.`);
        failed++;
        continue;
      }

      const slug = slugify(name);
      if (await prisma.product.findUnique({ where: { slug } })) {
        console.log(`  • Baris ${line}: "${name}" sudah ada — dilewati.`);
        skipped++;
        continue;
      }

      const images = (r.imageUrls || "")
        .split("|")
        .map((u) => u.trim())
        .filter(Boolean);

      await prisma.product.create({
        data: {
          name,
          slug,
          description,
          price,
          compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice) || null : null,
          stock: r.stock ? Number(r.stock) || 0 : 0,
          featured: /^(true|1|ya|yes)$/i.test(r.featured || ""),
          categoryId: await categoryId(category),
          images: { create: images.map((url, pos) => ({ url, position: pos })) },
        },
      });
      console.log(`  ✓ Baris ${line}: "${name}" ditambahkan.`);
      created++;
    } catch (err) {
      console.error(`  ✗ Baris ${line}: gagal —`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nSelesai. Ditambahkan: ${created}, dilewati: ${skipped}, gagal: ${failed}.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
