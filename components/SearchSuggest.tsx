"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatIDR } from "@/lib/format";
import { tokenize, highlightParts } from "@/lib/search";
import AppIcon from "@/components/AppIcon";
import FancySelect from "@/components/FancySelect";

type SuggestProduct = { id: string; name: string; slug: string; price: number; imageUrl: string };
type SuggestCategory = { id: string; name: string; slug: string };
type Results = { products: SuggestProduct[]; categories: SuggestCategory[] };

// Navbar search with a typeahead dropdown. The underlying markup is still a
// plain GET form to /search, so it keeps working without JS — the dropdown is
// purely additive. Suggestions are debounced fetches to /api/search/suggest,
// scoped to the category dropdown's current value.
export default function SearchSuggest({ categories }: { categories: SuggestCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = q.trim();

  // Navigating away (suggestion click, form submit) must close the panel —
  // the Navbar lives in the layout, so its state survives route changes.
  // Adjusted during render instead of in an effect (React's recommended
  // pattern for reacting to prop/state changes without cascading renders).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (category) params.set("category", category);
        const res = await fetch(`/api/search/suggest?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("suggest gagal");
        setResults((await res.json()) as Results);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [trimmed, category]);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // Flat keyboard-navigable list: category chips first, then products.
  const items = useMemo(() => {
    const list: { href: string; key: string }[] = [];
    results?.categories.forEach((c) => list.push({ href: `/search?category=${c.slug}`, key: `c-${c.id}` }));
    results?.products.forEach((p) => list.push({ href: `/product/${p.slug}`, key: `p-${p.id}` }));
    return list;
  }, [results]);

  function closeAndGo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && active >= 0 && items[active]) {
      e.preventDefault();
      closeAndGo(items[active].href);
    }
  }

  const showPanel = open && trimmed.length >= 2;
  const catOffset = results?.categories.length ?? 0;
  const hasAny = (results?.categories.length ?? 0) + (results?.products.length ?? 0) > 0;

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      {/* overflow-hidden is gone ON PURPOSE: it clipped the category
          scoper's popover, which opens downward out of the bar. */}
      <form
        id="tour-search"
        action="/search"
        className="glass-chip w-full flex items-center rounded-full"
      >
        {/* Category scoper — FancySelect for the shop's look; a hidden input
            keeps the no-JS GET form carrying ?category=. Opening it closes
            the suggest panel so two menus never overlap. */}
        <div className="hidden sm:block pl-1.5">
          <FancySelect
            value={category}
            onChange={setCategory}
            ariaLabel="Scope kategori pencarian"
            options={[
              { value: "", label: "Semua" },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ]}
            onOpenChange={(o) => {
              if (o) setOpen(false);
            }}
            triggerClassName="rounded-full bg-white/60 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white/90 hover:text-bimbi-ink"
          />
          <input type="hidden" name="category" value={category} />
        </div>
        <input
          type="text"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            if (trimmed.length >= 2 && results) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Cari semua di Bimbi Toys online dan di toko"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls="navbar-suggest-panel"
          className="flex-1 min-w-0 px-4 py-2.5 md:py-3 text-sm text-bimbi-ink outline-none placeholder:text-slate-400 bg-transparent"
        />
        <button
          type="submit"
          aria-label="Cari"
          className="m-1 h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors btn-press"
        >
          <AppIcon name="search" size={18} />
        </button>
      </form>

      {showPanel && (
        <div
          id="navbar-suggest-panel"
          role="listbox"
          // Solid ON PURPOSE, not glass: this panel holds search results the
          // user is actively reading — full opacity keeps text crispest, and
          // the user asked for the floating results to be 100% opaque.
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          {loading && (
            <p className="px-4 py-3 text-xs font-semibold text-slate-400">Mencari…</p>
          )}

          {!loading && results && !hasAny && (
            <p className="px-4 py-3 text-xs font-semibold text-slate-400">
              Nggak ketemu — coba kata kunci lain.
            </p>
          )}

          {!loading && results && results.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-2">
              {results.categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/search?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    active === i ? "bg-bimbi-sun text-bimbi-ink" : "bg-bimbi-cream text-bimbi-ink hover:bg-bimbi-sun"
                  }`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {!loading && results && results.products.length > 0 && (
            <ul className="p-1.5">
              {results.products.map((p, i) => {
                const isActive = active === catOffset + i;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                        isActive ? "bg-bimbi-cream" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-lg text-slate-300">
                            🧸
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-bimbi-ink">
                          {highlightParts(p.name, tokenize(trimmed)).map((part, j) =>
                            part.match ? (
                              <mark key={j} className="rounded-sm bg-bimbi-sun/70 px-0.5 text-inherit">
                                {part.text}
                              </mark>
                            ) : (
                              <span key={j}>{part.text}</span>
                            )
                          )}
                        </span>
                        <span className="block text-xs font-bold text-bimbi-pink-dark">
                          {formatIDR(p.price)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && hasAny && (
            <button
              type="submit"
              form="tour-search"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs font-bold text-bimbi-sky hover:bg-slate-50 transition-colors"
            >
              <AppIcon name="search" size={14} />
              Lihat semua hasil untuk “{trimmed}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
