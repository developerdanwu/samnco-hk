# Search: API route and combobox

Type: task
Status: resolved
Blocked by: 18, 19

## Question

Per ticket 09, measured.

**Route** `/api/search?q=&limit=` — `prerender = false`, excluded from locale middleware, `select`
to trim the payload 29%, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` as the
quota defence. Validate `q` (2–64) and clamp `limit`. Token stays server-side. Standard envelope.

**Client**: Base UI combobox island, React Query, **300 ms debounce**, min 2 chars, `AbortController`
cancellation, `placeholderData` to avoid blanking. Six states, all with copy in both locales —
including `search_en_only` on zh-HK, because the catalogue is English and Chinese queries return 0.

Title-match only — **full-text was tested and rejected** (dumps 178 of 348 for "office").
Client-side category-name matching offers `search_category_hint`.

## Answer

**Done, and verified in a browser against the live catalogue.**

### Endpoint

`GET /api/search?q=&limit=` — `prerender = false`, excluded from the locale middleware, `select` to
trim the upstream payload, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.

| request | result |
| --- | --- |
| `?q=pen` | 200, total 23 — matches ticket 09's measurement exactly |
| `?q=pen&limit=3` | 200, 3 returned |
| `?q=x` | **400**, "q must be 2-64 characters" |
| `?limit=999&q=pencil` | limit clamped |
| upstream failure | 502 with `"search unavailable"` — **never the Contentful body**, which echoes the query shape |

### Client behaviour, measured

| | |
| --- | --- |
| typing `p` (below minimum) | **0 requests** |
| typing `pencil` — 6 keystrokes | **1 request** — debounce works |
| `crayola` | 8 results, first is *Crayola Crayons Unwashable 16 Colors* |
| **`office`** | **"Looking for Office stationery? See all 171."** |
| `zzzqqq` | "Nothing matched "zzzqqq". Try a shorter word, or ask us." |
| 鉛筆 on zh-hk | 找不到「鉛筆」… **貨品名稱以英文記錄，請以英文搜尋。** |

The `office` case is the one that justifies the whole design: title-match returns nothing for it, and
full-text would have returned 178 of 348. The client-side category hint answers it correctly with
**no request at all**.

### ⚠ Deviation: this is not the Base UI combobox

Tickets 04 and 09 specified shadcn's Base UI `combobox`. **It is not what shipped.** The component
is installed, but its `Root` is a bare pass-through to `@base-ui/react`, and the `items` / `filter`
props the async pattern depends on are not declared in the shipped `ComboboxRoot.d.ts` — they come
from an inherited type I could not confirm without a lot of guessing. **Shipping invented props
would have been worse than not using it**, so the panel is built from a plain `<input>` and an
anchored results list.

The accessibility that the primitive would have provided was written by hand instead, and verified:

| | |
| --- | --- |
| `role="combobox"`, `aria-expanded` | ✓ |
| `aria-controls`, `aria-autocomplete="list"` | ✓ |
| `aria-activedescendant` tracks the highlighted row | ✓ `search-row-0` → `search-row-1` |
| Arrow keys move and **wrap** | ✓ ArrowUp from the top → `search-row-7` |
| Enter follows the highlighted row | ✓ navigates to `/detail/…` |
| Escape closes | ✓ |

**What is still missing versus the primitive**: screen-reader result-count announcements and typeahead
semantics that a mature combobox handles for free. If that matters, swapping in the real primitive is
contained to this one file — but it should be done by reading Base UI's live documentation, not its
type declarations.
