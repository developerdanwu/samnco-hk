# Shop grid: categories and pagination

Type: task
Status: resolved
Blocked by: 18, 19

## Question

Four across desktop, **two across mobile**. Card is image tile + serif title + category — **no price
anywhere** (94% lack one) and no `category2` slot.

Category filters carry counts and scroll horizontally on mobile. Routes `/shop` and
`/shop/<category>` unchanged (ticket 08).

**Pagination is 1-based with `skip = (N-1) * 36`** — the current site computes `page * 36`, so
clicking "1" jumps to products 37–72 and the last page renders empty. Do not reproduce it.

Grid images: `srcset` at w_200/400/600, first row eager, rest lazy. A shop page should weigh
**~0.55 MB of images, not 6 MB** (ticket 15).

## Answer

**Done. 46 prerendered pages (23 per locale), browser-verified.**

### The headline number holds

| | images |
| --- | --- |
| Flask site, same 36 products | **6.03 MB** |
| this build, desktop fully scrolled | **0.60 MB** |
| mobile, above the fold | **165 KB** (29 of 38 — lazy loading working) |

A **90% reduction**, matching ticket 15's prediction of ~0.55 MB. *(Measured against a local server
that does not compress, so the 934 KB non-image figure is uncompressed; the JS is 118.6 KB gzipped
and Vercel serves brotli.)*

### The Flask pagination bug is gone, and verified absent

| | |
| --- | --- |
| `/shop` | 36 products |
| `/shop/page/9` | 36 |
| `/shop/page/10` | **24** — not empty. The old site's last page rendered nothing |
| page 1 ∩ page 2 | **0 products** — the old `page * 36` made "1" jump to products 37–72 |

Category pages match the audit exactly: office-stationery 5 pages, seasonal 3, art-supplies 3,
lifestyle 1 (10 products), children 1 (6 products).

### Correction to ticket 08: pagination is path-based, not `?page=N`

Ticket 08 decided to keep `?page=N`. **That is not implementable with `output: "static"`** — a
prerendered document does not vary by query string, so every `?page=N` would have served page 1's
bytes. Corrected to `/shop/page/N` and `/shop/<category>/page/N`, recorded in ticket 08.

**This costs nothing in URL continuity**, which was the only reason to keep the query form: the old
URLs served arbitrary content because of the off-by-one, so there is no correct old behaviour to
preserve. Old `?page=N` links land on `/shop` page 1.

### Card

Image tile, serif title, category label. **No price** (94% lack one) and **no `category2`** (null on
86%, retired). Two across on mobile, four on desktop — verified as 2/4 in the browser. The first
four images are `loading="eager"`, the rest lazy.

Category filters carry counts and scroll horizontally on mobile rather than wrapping to three rows.
