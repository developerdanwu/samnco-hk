# Search UX and the API-route contract

Type: grilling
Status: resolved
Blocked by: 02

## Question

Search is the one piece of server that survives the Flask deletion: a debounced client → an Astro
API route → Contentful, with React Query on the client. The architecture is settled; the behaviour
and the contract are not.

> Sizing note from ticket 01: the catalogue is **348 products**, far smaller than assumed at
> charting. A prebuilt static index would therefore have been perfectly viable (~a few hundred KB of
> JSON). The debounced API route was chosen deliberately and still wins on freshness and on keeping
> the token server-side — this is recorded so the trade-off is visible, not to reopen it.

> Constraint from ticket 03: the `/api/` route must be **excluded from the Paraglide locale
> middleware**, and it is the one route that does not prerender.

- **What is searched?** Today it is `fields.title[match]` only — a substring match on the title,
  with no typo tolerance and no matching on category. Is title-only parity acceptable, or should
  the query widen? Contentful's full-text `query` parameter searches across fields and would be a
  behaviour change, for the better.
- **The endpoint contract.** Request shape (query string, pagination, locale?), response shape,
  and how errors are represented. Follow the repo's standard envelope convention.
- **Debounce and request behaviour.** Debounce interval, minimum query length before firing, whether
  in-flight requests are cancelled on a new keystroke, and the React Query configuration —
  `staleTime`, cache key, and holding previous results visible while the next query loads.
- **Every state has a design.** Idle, typing-below-minimum, loading, results, no results, and error.
  The current site has none of these; a failed search simply renders an empty grid.
- **Results presentation.** A popover over the input, or replacing the product grid in place? The
  latter is closer to today's behaviour; the former is what a Combobox naturally gives.
- **Rate limiting and abuse.** The route proxies a Contentful token, so an unthrottled endpoint
  spends the space's API quota. Decide whether limiting is needed now or noted as a follow-up.
- **Does search work without JavaScript?** Today it does — a plain form POST. The new design should
  decide deliberately whether that degrades or is dropped.

Resolved when the contract is written down and the state machine is agreed.

## Answer

**Measured against the live catalogue rather than reasoned about.** Every number below came from
querying the real space.

### 1. Search titles only — full-text was tested and rejected

The open question was `fields.title[match]` (today's behaviour) versus Contentful's full-text
`query`. Measured side by side:

| term | `title[match]` | full-text `query` |
| --- | --- | --- |
| pen | 23 | 23 |
| pencil | 21 | 21 |
| crayola | 17 | 17 |
| glue | 10 | 10 |
| lunar new year | 27 | 27 |
| magnet | 9 | 9 |
| **office** | **0** | **178** |

**For every real product term the two are identical.** Full-text differs in exactly one way: it also
matches the `category` field, so "office" returns 178 — **more than half the catalogue**, unranked.
That is a category dump wearing a search result's clothes, not a better answer.

**Decision: keep `fields.title[match]`.** Same quality where it matters, far smaller blast radius.

**But handle the category case deliberately**, because "office" returning nothing is also bad: the
five category names are known at build time, so match the query against them **client-side, with no
API call**, and offer the category as a suggestion alongside title results — new message
`search_category_hint`, "Looking for Office stationery? See all 171."

### 2. No typo tolerance — confirmed, and it is parity

`crayla`, `pencl`, `cryola` all return **0 results under both approaches**. Contentful's `match` is
substring, not fuzzy. This is exactly today's behaviour, so it is not a regression — but the empty
state has to carry the weight (`search_none`: "Try a shorter word, or ask us").

### 3. Chinese queries return nothing — a real gap, now surfaced

The space is **`en-US` only** (ticket 02), so 鉛筆 returns 0. A zh-HK visitor searching in Chinese
gets silence with no explanation. **New message `search_en_only`** — 貨品名稱以英文記錄，請以英文搜尋 —
shown in the empty state on the Chinese locale only. Added to the approved catalogue (2 keys, 93
total); flagged to Dan as an addition after approval.

### 4. Latency shapes the interaction: ~270ms median, up to ~530ms

Five runs of the same query: **501, 208, 269, 193, 527 ms** — median 269, cold 458. Contentful's CDN
warms repeats but noisily. Add the browser→Vercel hop and a keystroke costs roughly 250–600 ms.

**"Instant search" is therefore a stretch, and the design must not pretend otherwise:**

- **Debounce 300 ms**, not 150 — each request is expensive enough that firing on every keystroke
  wastes quota for results nobody reads.
- **Minimum 2 characters** before the first request.
- **Cancel in-flight requests** with `AbortController` on each new keystroke — Base UI's combobox
  ships a documented pattern for exactly this (ticket 04).
- **Cache hard at the route**: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
  The catalogue is effectively frozen, so an hour of edge cache is safe, makes repeat queries
  instant, and is the **primary defence against quota abuse** — a scraper hitting the endpoint mostly
  hits Vercel's cache, not Contentful.
- **React Query**: `queryKey: ['search', q]`, `staleTime: 5 * 60_000`, and `placeholderData` holding
  the previous results visible while the next query loads, so the list does not blank between
  keystrokes.

### 5. Endpoint contract

`GET /api/search?q=<string>&limit=<1..24>` — `export const prerender = false`, excluded from the
Paraglide locale middleware (ticket 03), and locale-independent since product data is English only.

```json
{ "ok": true,
  "data": { "items": [ { "id": "…", "title": "…", "category": "…", "image": "…" } ],
            "total": 23, "query": "pen" },
  "error": null }
```

Errors return the same envelope with `ok: false`, `data: null`, and a short `error` string — never a
Contentful payload, which would leak the query shape.

- **Trim the upstream response with `select`**: `sys.id,fields.title,fields.category,fields.image`
  measured **11.7 KB → 8.3 KB, 29% smaller** for 8 results.
- **Validate at the boundary**: `q` trimmed, length 2–64, rejected otherwise with `ok: false`;
  `limit` clamped to 1–24. Never forward raw input to Contentful.
- The **Delivery token stays server-side** in Vercel env vars. This route is the only server that
  survives the Flask deletion.

### 6. Six states, all with copy in both languages (ticket 07)

`idle` → `search_idle` · below-minimum → the placeholder, no request · `loading` → `search_loading`
· `results` → `search_results` ("{count} products") · `empty` → `search_none`, plus
`search_category_hint` when the query names a category, plus `search_en_only` on zh-HK ·
`error` → `search_error`, which gives the phone number rather than an apology.

### 7. Results appear in a popover, not by replacing the grid

The Base UI combobox gives this natively. It also means **there is no search results page and no
shareable search URL** — which is **not a regression**: today's search is a form POST, so its
results are equally unshareable.

### 8. Search does not work without JavaScript — accepted, with a mitigation

Today it does, via the form POST. Restoring that would need a second dynamic route rendering HTML,
for a vanishingly small audience. **Accepted as a deliberate, recorded loss.** The mitigation is
real: the **five category links are ordinary anchors and work without JavaScript**, so a no-JS
visitor can still browse the whole catalogue by category. The search input is hidden rather than
shown broken.
