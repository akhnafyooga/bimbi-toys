/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS
   script run directly by `node` (see package.json "db:cleanup"), deliberately
   independent of the Next.js/TypeScript build step. */
/*
 * Bimbi Toys — catalog cleanup: keep only brand-recognized products.
 *
 *   1. classify every product against docs/brand-allowlist.json
 *   2. products with NO brand signal are removed:
 *        - never ordered  -> DELETED (images/stock/shelf/cart/wishlist cascade)
 *        - ever ordered   -> moved to the "Arsip" category (order history needs
 *                            the row: OrderItem.productId is ON DELETE RESTRICT)
 *
 * Usage (dry run is the default — it writes nothing except the review CSV):
 *     npm run db:cleanup                     # report + refresh the review CSV
 *     npm run db:cleanup -- --apply          # do the writes
 *     npm run db:cleanup -- --no-csv         # report only, don't touch the CSV
 *     npm run db:cleanup -- --sample=30      # how many names to print per bucket
 *
 * Decisions in docs/brand-cleanup-review.csv (the `decision` column) always win
 * over the classifier, so a human override can never be lost by re-running.
 *
 * Talks to Postgres through `pg` rather than Prisma on purpose: Prisma's engine
 * resolves the Neon hostname to an unreachable IPv6 address on this machine and
 * hangs until the connection-pool timeout. `pg` uses Node's resolver, which
 * falls back to IPv4, so the cleanup runs from a laptop against Neon.
 *
 * The "arsip" slug below must stay in sync with HIDDEN_CATEGORY_SLUGS in
 * lib/storefront.ts — that constant is what hides the category from the shop.
 */
const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns").promises;

const ROOT = path.join(__dirname, "..");
const ALLOWLIST_PATH = path.join(ROOT, "docs", "brand-allowlist.json");
const REVIEW_CSV = path.join(ROOT, "docs", "brand-cleanup-review.csv");
const ARCHIVE_SLUG = "arsip";
const ARCHIVE_NAME = "Arsip";

const ALLOW = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));

// ---- classifier (mirror of the rules described in docs/brand-allowlist.json) --
const normalize = (s) =>
  (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const squash = (s) => normalize(s).replace(/\s+/g, "");
const words = (s) => normalize(s).split(" ").filter(Boolean);
const alphaLen = (s) => (s || "").replace(/[^A-Z]/g, "").length;

function buildAliasIndex() {
  const idx = [];
  const groups = { A: ALLOW.brands, B: ALLOW.characters, C: ALLOW.stationery };
  for (const [tier, map] of Object.entries(groups)) {
    for (const [canonical, aliases] of Object.entries(map)) {
      for (const a of aliases) {
        const sq = squash(a);
        if (sq) idx.push({ alias: a, squash: sq, canonical, tier });
      }
    }
  }
  idx.sort((a, b) => b.squash.length - a.squash.length);
  return idx;
}

const aliasIndex = buildAliasIndex();
const quarantine = (ALLOW.quarantine || []).map(squash);
const genericWords = new Set((ALLOW.genericWords || []).map(normalize).filter(Boolean));
const reviewTokens = new Set((ALLOW.reviewTokens || []).map(normalize).filter(Boolean));

function classify(p) {
  const nameN = normalize(p.name);
  const nameSq = squash(p.name), dispSq = squash(p.displayName), skuSq = squash(p.sku);
  const nameWords = words(p.name), dispWords = words(p.displayName), skuWords = words(p.sku);

  for (const e of aliasIndex) {
    const short = alphaLen(e.squash) <= 3;
    const where = (short ? nameWords.includes(e.squash) : nameSq.includes(e.squash))
      ? "name"
      : (short ? dispWords.includes(e.squash) : dispSq.includes(e.squash))
        ? "display_name"
        : (short ? skuWords.includes(e.squash) : skuSq.includes(e.squash))
          ? "sku"
          : null;
    if (where) {
      return {
        verdict: "KEEP",
        confidence: where === "sku" ? "medium" : "high",
        tier: e.tier,
        brand: e.canonical,
        alias: e.alias,
        loc: where,
        note: "",
      };
    }
  }
  for (const q of quarantine) {
    if (nameWords.includes(q) || dispWords.includes(q)) {
      return { verdict: "REVIEW", confidence: "low", tier: "D", brand: "-", alias: q, loc: "name", note: "token ambigu (Tier D): " + q };
    }
  }
  const first = nameN.split(" ")[0];
  if (reviewTokens.has(first)) {
    return { verdict: "REVIEW", confidence: "low", tier: "?", brand: "-", alias: first, loc: "name", note: "kemungkinan merek lokal/tak dikenal: " + first };
  }
  if (/^[A-Z]{4,}$/.test(first) && !genericWords.has(first)) {
    return { verdict: "REVIEW", confidence: "low", tier: "?", brand: "-", alias: first, loc: "name", note: "kemungkinan merek tak dikenal: " + first };
  }
  return { verdict: "DELETE", confidence: "high", tier: "-", brand: "-", alias: "-", loc: "none", note: "tanpa sinyal merek" };
}

function esc(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
// ---- review sheet (the human layer) -----------------------------------------
function parseCsv(text) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
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
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

const VALID_DECISIONS = ["KEEP", "DELETE", "REVIEW"];

// Raw `decision` cell per product id, so a human override survives every re-run.
function loadDecisions() {
  const map = new Map();
  if (!fs.existsSync(REVIEW_CSV)) return map;
  const text = fs.readFileSync(REVIEW_CSV, "utf8").replace(/^\uFEFF/, "");
  for (const row of parseCsv(text)) {
    if (row.id && row.decision) map.set(row.id, row.decision);
  }
  return map;
}

// ---- database ---------------------------------------------------------------
async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL kosong — jalankan lewat `npm run db:cleanup`.");
  const u = new URL(process.env.DATABASE_URL);
  const hostname = u.hostname;
  let host = hostname;
  try {
    const a = await dns.resolve4(hostname);
    if (a.length) host = a[0];
  } catch {}
  const client = new Client({
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host,
    port: Number(u.port || 5432),
    database: u.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: true, servername: hostname },
    connectionTimeoutMillis: 20000,
    statement_timeout: 60000,
    query_timeout: 60000,
  });
  await client.connect();
  return client;
}

const AUDIT_SQL = `SELECT p.id, p.name, p."displayName", p.sku, c.name AS category, c.slug AS "categorySlug",
    p.price, p.stock, p.featured,
    (SELECT count(*)::int FROM "ProductImage" i WHERE i."productId" = p.id) AS images,
    (SELECT count(*)::int FROM "ProductShelf" s WHERE s."productId" = p.id) AS shelf_rows,
    (SELECT count(*)::int FROM "OrderItem" o WHERE o."productId" = p.id) AS ordered_rows,
    (SELECT count(*)::int FROM "CartItem" ct WHERE ct."productId" = p.id) AS cart_rows,
    (SELECT count(*)::int FROM "WishlistItem" w WHERE w."productId" = p.id) AS wish_rows,
    (SELECT coalesce(sum(ss.quantity),0)::int FROM "StoreStock" ss WHERE ss."productId" = p.id) AS store_stock
  FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
  ORDER BY c.name, p.name`;

function classifyAll(rows, decisions) {
  const byName = new Map();
  for (const r of rows) {
    const k = squash(r.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(r.id);
  }
  const dupOf = new Map();
  for (const ids of byName.values()) {
    if (ids.length > 1) for (const id of ids) dupOf.set(id, ids[0]);
  }

  return rows.map((r) => {
    const base = classify(r);
    const raw = decisions.get(r.id);
    const override = raw && VALID_DECISIONS.includes(raw.toUpperCase()) ? raw.toUpperCase() : null;
    const verdict = override || base.verdict;

    const flags = [];
    if (r.ordered_rows > 0) flags.push("ordered=" + r.ordered_rows);
    if (r.shelf_rows > 0) flags.push("on_shelves=" + r.shelf_rows);
    if (r.images > 0) flags.push("images=" + r.images);
    if (r.cart_rows > 0) flags.push("in_carts=" + r.cart_rows);
    if (r.wish_rows > 0) flags.push("wishlisted=" + r.wish_rows);
    if (r.store_stock > 0) flags.push("store_stock=" + r.store_stock);
    if (r.featured) flags.push("featured");
    if (dupOf.has(r.id)) flags.push("dup_of=" + dupOf.get(r.id));

    let note = base.note || "";
    if (override) note = (note ? note + "; " : "") + "override manual: " + override;
    if (dupOf.has(r.id)) note += (note ? "; " : "") + "duplikat nama dengan " + dupOf.get(r.id);
    if (verdict === "DELETE" && r.ordered_rows > 0) note += (note ? "; " : "") + "diproteksi riwayat pesanan -> diarsipkan, bukan dihapus";

    return {
      ...r,
      verdict,
      confidence: override ? "manual" : base.confidence,
      tier: base.tier,
      brand: base.brand,
      alias: base.alias,
      loc: base.loc,
      flags: flags.join(";"),
      note,
      decision: raw || "",
      needs_attention: verdict === "REVIEW" || dupOf.has(r.id) ? "Y" : "",
      alreadyArchived: r.categorySlug === ARCHIVE_SLUG,
    };
  });
}

function writeReviewCsv(rows) {
  const header = ["verdict","confidence","tier","brand_guess","matched_alias","match_location","flags","id","name","display_name","sku","category","price","stock","store_stock","needs_attention","decision","note"];
  const lines = [header.join(",")];
  for (const c of rows) {
    lines.push([
      c.verdict, c.confidence, c.tier, c.brand, c.alias, c.loc, c.flags, c.id,
      esc(c.name), esc(c.displayName), esc(c.sku), esc(c.category),
      c.price, c.stock, c.store_stock, c.needs_attention, esc(c.decision), esc(c.note),
    ].join(","));
  }
  fs.writeFileSync(REVIEW_CSV, "\uFEFF" + lines.join("\r\n"));
}
// ---- plan + apply -----------------------------------------------------------
const fmtIDR = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const sumStock = (rows) => rows.reduce((s, r) => s + Number(r.stock || 0), 0);
const sumValue = (rows) => rows.reduce((s, r) => s + Number(r.price || 0) * Math.max(1, Number(r.stock || 0)), 0);

function printBucket(title, rows, sample) {
  console.log("\n== " + title + " == " + rows.length + " produk | stok " + sumStock(rows) + " | nilai " + fmtIDR(sumValue(rows)));
  for (const r of rows.slice(0, sample)) {
    console.log("   " + (r.brand && r.brand !== "-" ? "[" + r.brand + "] " : "") + r.name + "   (" + r.category + ")");
  }
  if (rows.length > sample) console.log("   … dan " + (rows.length - sample) + " produk lain (lihat " + path.relative(ROOT, REVIEW_CSV) + ")");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const writeCsv = !process.argv.includes("--no-csv");
  const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
  const sample = sampleArg ? Math.max(1, Number(sampleArg.split("=")[1]) || 15) : 15;

  const decisions = loadDecisions();
  const client = await connect();
  let archiveId = null;
  try {
    const before = (await client.query('SELECT count(*)::int AS n FROM "Product"')).rows[0].n;
    const rows = (await client.query(AUDIT_SQL)).rows;
    const classified = classifyAll(rows, decisions);

    const archiveCat = (await client.query('SELECT id FROM "Category" WHERE slug = $1', [ARCHIVE_SLUG])).rows[0];
    archiveId = archiveCat ? archiveCat.id : null;

    const plan = {
      keep: classified.filter((c) => c.verdict === "KEEP"),
      review: classified.filter((c) => c.verdict === "REVIEW"),
      del: classified.filter((c) => c.verdict === "DELETE" && c.ordered_rows === 0 && !c.alreadyArchived),
      archive: classified.filter((c) => c.verdict === "DELETE" && c.ordered_rows > 0 && !c.alreadyArchived),
    };

    console.log("mode              : " + (apply ? "APPLY — MENULIS KE DATABASE" : "DRY RUN — tidak ada tulisan ke database"));
    console.log("produk di database: " + rows.length);
    console.log("kategori Arsip    : " + (archiveId ? "sudah ada (" + archiveId + ")" : "belum ada — akan dibuat otomatis"));
    console.log("override manual   : " + decisions.size + " baris terisi di " + path.relative(ROOT, REVIEW_CSV));
    console.log("RENCANA           : keep " + plan.keep.length + " | hapus " + plan.del.length + " | arsip " + plan.archive.length + " | review " + plan.review.length);

    printBucket("KEEP — merek dikenal", plan.keep, sample);
    printBucket("HAPUS — tanpa merek, belum pernah dipesan", plan.del, sample);
    printBucket("ARSIP — tanpa merek, ada riwayat pesanan (tidak bisa dihapus)", plan.archive, sample);
    printBucket("REVIEW — butuh keputusan manusia", plan.review, sample);

    if (writeCsv && !apply) {
      writeReviewCsv(classified);
      console.log("\nCSV diperbarui: " + path.relative(ROOT, REVIEW_CSV));
    }

    if (!apply) {
      console.log("\nBelum ada yang diubah. Jalankan `npm run db:cleanup -- --apply` untuk mengeksekusi.");
      return;
    }
    const delIds = plan.del.map((r) => r.id);
    const archiveIds = plan.archive.map((r) => r.id);

    // Nothing left to do: bail out BEFORE touching the rollback manifest, so a
    // second run can never overwrite the record of the first one.
    if (delIds.length === 0 && archiveIds.length === 0) {
      console.log("\nTidak ada yang perlu dihapus atau diarsipkan — database sudah bersih, tidak ada yang diubah.");
      return;
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const manifestPath = path.join(ROOT, "docs", "cleanup-rollback-" + stamp + ".json");

    // Complete restore source: every column of every affected product plus the
    // child rows the database would cascade away — written BEFORE any write.
    const touched = [...delIds, ...archiveIds];
    const ids = touched.length ? touched : ["__none__"];
    // A single pg client runs one query at a time, so these stay sequential.
    const fullRows = await client.query('SELECT * FROM "Product" WHERE id = ANY($1::text[])', [ids]);
    const imageRows = await client.query('SELECT "productId", url, alt, position FROM "ProductImage" WHERE "productId" = ANY($1::text[])', [ids]);
    const stockRows = await client.query('SELECT "productId", "storeId", quantity FROM "StoreStock" WHERE "productId" = ANY($1::text[])', [ids]);
    const shelfRows = await client.query('SELECT "productId", "shelfId", position FROM "ProductShelf" WHERE "productId" = ANY($1::text[])', [ids]);
    const cartRows = await client.query('SELECT "productId", "userId", quantity FROM "CartItem" WHERE "productId" = ANY($1::text[])', [ids]);
    const wishRows = await client.query('SELECT "productId", "userId" FROM "WishlistItem" WHERE "productId" = ANY($1::text[])', [ids]);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          archiveSlug: ARCHIVE_SLUG,
          willDelete: delIds.length,
          willArchive: archiveIds.length,
          products: fullRows.rows,
          productImages: imageRows.rows,
          storeStock: stockRows.rows,
          productShelf: shelfRows.rows,
          cartItems: cartRows.rows,
          wishlistItems: wishRows.rows,
        },
        null,
        2
      )
    );
    console.log("\nrollback manifest: " + path.relative(ROOT, manifestPath) + " (" + fullRows.rows.length + " produk + relasinya)");

    await client.query("BEGIN");
    try {
      if (!archiveId) {
        archiveId = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        await client.query('INSERT INTO "Category" (id, name, slug) VALUES ($1, $2, $3)', [archiveId, ARCHIVE_NAME, ARCHIVE_SLUG]);
        console.log("\n+ kategori dibuat: " + ARCHIVE_NAME + " (slug " + ARCHIVE_SLUG + ")");
      }
      if (delIds.length) {
        const res = await client.query(
          'DELETE FROM "Product" AS p WHERE p.id = ANY($1::text[]) AND NOT EXISTS (SELECT 1 FROM "OrderItem" o WHERE o."productId" = p.id) RETURNING p.id',
          [delIds]
        );
        console.log("hapus produk  : " + res.rowCount + (res.rowCount === delIds.length ? "" : " (dilewati " + (delIds.length - res.rowCount) + " karena punya riwayat pesanan)"));
      } else {
        console.log("hapus produk  : 0 (tidak ada yang perlu dihapus)");
      }
      if (archiveIds.length) {
        const r1 = await client.query('UPDATE "Product" SET "categoryId" = $1, stock = 0, featured = false WHERE id = ANY($2::text[])', [archiveId, archiveIds]);
        const r2 = await client.query('DELETE FROM "ProductShelf" WHERE "productId" = ANY($1::text[])', [archiveIds]);
        const r3 = await client.query('DELETE FROM "CartItem" WHERE "productId" = ANY($1::text[])', [archiveIds]);
        const r4 = await client.query('DELETE FROM "WishlistItem" WHERE "productId" = ANY($1::text[])', [archiveIds]);
        console.log("arsip produk  : " + r1.rowCount + " (lepas dari rak: " + r2.rowCount + ", cart: " + r3.rowCount + ", wishlist: " + r4.rowCount + ")");
      } else {
        console.log("arsip produk  : 0 (tidak ada yang perlu diarsipkan)");
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const after = (await client.query('SELECT count(*)::int AS n FROM "Product"')).rows[0].n;
    const inArchive = (await client.query('SELECT count(*)::int AS n FROM "Product" WHERE "categoryId" = $1', [archiveId])).rows[0].n;
    const orderItems = (await client.query('SELECT count(*)::int AS n FROM "OrderItem"')).rows[0].n;

    // Integrity check: the cascade must have left nothing pointing at a product
    // that no longer exists.
    const orphans = (
      await client.query(`SELECT
        (SELECT count(*)::int FROM "ProductImage" i  WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = i."productId")) AS images,
        (SELECT count(*)::int FROM "ProductShelf" s  WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = s."productId")) AS shelf_links,
        (SELECT count(*)::int FROM "StoreStock" s    WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = s."productId")) AS store_stock,
        (SELECT count(*)::int FROM "CartItem" c      WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = c."productId")) AS carts,
        (SELECT count(*)::int FROM "WishlistItem" w  WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = w."productId")) AS wishlists`)
    ).rows[0];

    console.log("\nSELESAI");
    console.log("  produk    : " + before + " -> " + after + "  (dihapus " + (before - after) + ")");
    console.log("  di Arsip  : " + inArchive);
    console.log("  OrderItem : " + orderItems + "   <- riwayat pesanan tidak boleh berubah");
    console.log("  row yatim : " + JSON.stringify(orphans) + "   <- semua harus 0");
    console.log("  rollback  : " + path.relative(ROOT, manifestPath));
    console.log("\nLangkah berikutnya: `npm run db:cleanup` sekali lagi (dry run) untuk memastikan rencana sudah kosong, lalu cek toko di browser.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("ERR " + e.message);
  process.exit(1);
});


