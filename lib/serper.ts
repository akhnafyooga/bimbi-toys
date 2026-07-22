// Product image discovery via Serper.dev (Google Images).
// One search costs 1 Serper credit. `gl`/`hl` bias results toward Indonesia so
// the top hits come from local marketplaces (Tokopedia, Shopee, Blibli, etc.).

export type SerperImage = {
  imageUrl: string;
  width: number;
  height: number;
  source?: string;
};

export async function searchProductImages(query: string): Promise<SerperImage[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY belum diset.");

  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "id", hl: "id", num: 6 }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Serper error ${res.status}`);

  const data = (await res.json()) as {
    images?: Array<{ imageUrl?: string; imageWidth?: number; imageHeight?: number; source?: string }>;
  };

  // Drop tiny results (logos/thumbnails); keep order (relevance) otherwise.
  return (data.images ?? [])
    .filter((i) => i.imageUrl && (i.imageWidth ?? 0) >= 400 && (i.imageHeight ?? 0) >= 400)
    .map((i) => ({
      imageUrl: i.imageUrl as string,
      width: i.imageWidth ?? 0,
      height: i.imageHeight ?? 0,
      source: i.source,
    }));
}
