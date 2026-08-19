# Search: API route and combobox

Type: task
Status: open
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
