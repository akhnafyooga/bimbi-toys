import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenize, relevance } from "@/lib/search";

// Typeahead for the navbar search box: a few ranked products + matching
// categories, scoped to the optional category dropdown. Public and hit on
// nearly every keystroke, so the in-memory rate limit (same pattern as
// shelf-ask) keeps the surface cheap to abuse.

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 100;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }

  const categorySlug = searchParams.get("category") ?? "";
  const categoryFilter = categorySlug ? { category: { slug: categorySlug } } : {};

  // Same tolerant token matching as /search, minus the description field —
  // typeahead wants name hits, not essay hits.
  const tokens = tokenize(q);
  const effective = tokens.length ? tokens : [q.toLowerCase()];
  const where = {
    AND: [
      categoryFilter,
      {
        OR: effective.flatMap((t) => [
          { name: { contains: t, mode: "insensitive" as const } },
          { displayName: { contains: t, mode: "insensitive" as const } },
        ]),
      },
    ],
  };

  const [rows, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        slug: true,
        price: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
      take: 50,
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" as const } },
      select: { id: true, name: true, slug: true },
      take: 3,
    }),
  ]);

  // Broad fetch, then rank with the storefront scorer so the dropdown's order
  // matches what a full search would show.
  const products = rows
    .map((p) => ({ p, s: relevance(p.displayName ?? p.name, p.description, q, effective) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ p }) => ({
      id: p.id,
      name: p.displayName ?? p.name,
      slug: p.slug,
      price: p.price,
      imageUrl: p.images[0]?.url ?? "",
    }));

  return NextResponse.json(
    { products, categories },
    { headers: { "Cache-Control": "no-store" } }
  );
}
