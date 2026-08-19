import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { m } from "../paraglide/messages.js";
import { getLocale, localizeHref } from "../paraglide/runtime.js";
import { imageUrl } from "../lib/images.ts";

const MIN_Q = 2;
const DEBOUNCE_MS = 300; // each request costs ~270ms median upstream (issue 09)

interface Hit { id: string; title: string; category: string; image: string }

const CATEGORY_LABEL: Record<string, () => string> = {
  "office-stationery": m.cat_office, "seasonal-products": m.cat_seasonal,
  "art-supplies": m.cat_art, lifestyle: m.cat_lifestyle, children: m.cat_children,
};

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false } },
});

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Panel({ counts }: { counts: Record<string, number> }) {
  const [raw, setRaw] = useState("");
  const q = useDebounced(raw.trim(), DEBOUNCE_MS);
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const enabled = q.length >= MIN_Q;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", q],
    enabled,
    // AbortController: a new keystroke cancels the request in flight rather than racing it.
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error);
      return body.data as { items: Hit[]; total: number };
    },
    placeholderData: (prev) => prev, // keep the last results visible while the next load
  });

  // A query naming a category is better answered by the category than by title matching:
  // "office" matches no product title but 171 products (issue 09). Client-side, no request.
  const categoryHit = useMemo(() => {
    if (!enabled) return null;
    const needle = q.toLowerCase();
    return (
      Object.keys(CATEGORY_LABEL).find((c) => {
        const label = CATEGORY_LABEL[c]().toLowerCase();
        return label.includes(needle) || c.replace(/-/g, " ").includes(needle);
      }) ?? null
    );
  }, [q, enabled]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items = data?.items ?? [];
  const showPanel = open && raw.trim().length > 0;

  // Keyboard navigation, written by hand rather than inherited from a combobox primitive —
  // see the note in issue 23. Arrow keys move, Enter follows, Escape closes.
  const rows = useMemo(
    () => [
      ...(categoryHit ? [localizeHref(`/shop/${categoryHit}`)] : []),
      ...items.map((it) => localizeHref(`/detail/${it.id}`)),
    ],
    [categoryHit, items],
  );
  useEffect(() => setActive(-1), [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!showPanel || !rows.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % rows.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? rows.length : i) - 1); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); window.location.href = rows[active]; }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="border-paper-300 bg-paper-raised flex h-12 items-center gap-2.5 border px-3.5">
        <SearchIcon className="text-paper-600 size-4 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `search-row-${active}` : undefined}
          placeholder={m.shop_search_placeholder({ count: 348 })}
          aria-label={m.search_idle()}
          className="placeholder:text-paper-650 h-full w-full bg-transparent text-[15px] outline-none"
        />
        {isFetching && <span className="eyebrow shrink-0">{m.search_loading()}</span>}
      </div>

      {showPanel && (
        <div
          role="listbox"
          id="search-results"
          className="border-paper-300 bg-paper-raised absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-96 overflow-y-auto border shadow-lg"
        >
          {raw.trim().length < MIN_Q ? (
            <p className="text-paper-650 px-4 py-3 text-sm">{m.search_idle()}</p>
          ) : isError ? (
            <p className="px-4 py-3 text-sm">{m.search_error()}</p>
          ) : (
            <>
              {categoryHit && (
                <a
                  href={localizeHref(`/shop/${categoryHit}`)}
                  id="search-row-0"
                  role="option"
                  aria-selected={active === 0}
                  className={`border-paper-200 block border-b px-4 py-3 text-sm ${active === 0 ? "bg-paper-200" : "bg-paper-100"}`}
                >
                  {m.search_category_hint({
                    category: CATEGORY_LABEL[categoryHit](),
                    count: counts[categoryHit] ?? 0,
                  })}
                </a>
              )}
              {items.map((it, i) => {
                const row = categoryHit ? i + 1 : i;
                return (
                <a
                  key={it.id}
                  id={`search-row-${row}`}
                  role="option"
                  aria-selected={active === row}
                  href={localizeHref(`/detail/${it.id}`)}
                  className={`flex items-center gap-3 px-3 py-2.5 ${active === row ? "bg-paper-200" : "hover:bg-paper-100"}`}
                >
                  <span className="bg-paper-200 flex size-11 shrink-0 items-center justify-center overflow-hidden">
                    <img src={imageUrl(it.image, 200) ?? ""} alt="" width="44" height="44"
                         className="size-[82%] object-contain mix-blend-multiply" loading="lazy" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-serif text-sm">{it.title}</span>
                    <span className="eyebrow">{CATEGORY_LABEL[it.category]?.()}</span>
                  </span>
                </a>
              );})}
              {!isFetching && !items.length && !categoryHit && (
                <div className="flex flex-col gap-1.5 px-4 py-3">
                  <p className="text-sm">{m.search_none({ query: q })}</p>
                  {/* The catalogue is en-US only, so a Chinese query returns nothing. Say why. */}
                  {getLocale() !== "en" && <p className="text-paper-650 text-xs">{m.search_en_only()}</p>}
                </div>
              )}
              {!!items.length && (
                <p className="text-paper-650 border-paper-200 border-t px-4 py-2 text-xs">
                  {m.search_results({ count: data!.total })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Search({ counts }: { counts: Record<string, number> }) {
  return (
    <QueryClientProvider client={client}>
      <Panel counts={counts} />
    </QueryClientProvider>
  );
}
