// Search helpers: tolerant token matching + "apakah maksud kamu" suggestions.
//
// Product names are retail shorthand, so exact-phrase matching misses a lot.
// We tokenize the query and match ANY token (case-insensitive), then rank by how
// well each product matches. When nothing matches, we suggest the closest known
// words from the catalog vocabulary (spell-correct style).

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

// Classic Levenshtein edit distance (rolling row, O(n) memory).
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

// Relevance score for one product against the query. Exact phrase in the name
// wins big; then each matched token in the name, then in the description.
export function relevance(
  name: string,
  description: string,
  phrase: string,
  tokens: string[]
): number {
  const N = name.toLowerCase();
  const D = description.toLowerCase();
  let s = 0;
  if (phrase && N.includes(phrase.toLowerCase())) s += 1000;
  for (const t of tokens) {
    if (N.includes(t)) s += 10;
    else if (D.includes(t)) s += 2;
  }
  return s;
}

// Build a word-frequency vocabulary from catalog names for spell suggestions.
export function buildVocab(names: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const n of names) {
    for (const w of n.toLowerCase().split(/[^a-z0-9]+/i)) {
      if (w.length >= 3) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return freq;
}

// "Apakah maksud kamu ...": for each query token that isn't a known word, find
// the closest catalog word (edit distance ≤ 2, ties broken by frequency).
// Returns the corrected query, or null if nothing sensible to suggest.
export function suggestQuery(q: string, vocab: Map<string, number>): string | null {
  const tokens = tokenize(q);
  if (tokens.length === 0) return null;
  let changed = false;
  const corrected = tokens.map((t) => {
    if (vocab.has(t)) return t;
    let best = t;
    let bestD = 3; // only accept distance ≤ 2
    let bestFreq = 0;
    for (const [w, f] of vocab) {
      if (Math.abs(w.length - t.length) > 2) continue;
      const d = levenshtein(t, w);
      if (d < bestD || (d === bestD && f > bestFreq)) {
        best = w;
        bestD = d;
        bestFreq = f;
      }
    }
    if (best !== t) changed = true;
    return best;
  });
  return changed ? corrected.join(" ") : null;
}

// Split a name into alternating plain/matched parts so the UI can wrap the
// matched tokens in a <mark>. Case-insensitive; tokens are sorted longest-first
// so "mobilan" wins over its "mobil" prefix, and tokens under 2 chars are
// ignored (they would highlight noise like "di").
export function highlightParts(name: string, tokens: string[]): { text: string; match: boolean }[] {
  const terms = [...new Set(tokens.filter((t) => t.length >= 2))].sort((a, b) => b.length - a.length);
  if (terms.length === 0) return [{ text: name, match: false }];

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");

  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const m of name.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: name.slice(last, i), match: false });
    parts.push({ text: m[0], match: true });
    last = i + m[0].length;
  }
  if (last < name.length) parts.push({ text: name.slice(last), match: false });
  return parts.length ? parts : [{ text: name, match: false }];
}
