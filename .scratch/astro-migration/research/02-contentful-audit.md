# Research: Contentful content model audit — `samAndCoProducts`

Ticket: [02-audit-contentful-content-model.md](../issues/02-audit-contentful-content-model.md)
Researched: 2026-08-19.

**Method: empirical.** Every number below was computed from the live Contentful Content Delivery
API (`https://cdn.contentful.com`, space "Sam and Company", environment `master`, credentials from
`.env`), by paging all 348 published entries (`limit=100`, `skip=0/100/200/300`) plus
`/content_types`, `/locales`, `/assets` and all 327 `umbrellaProduct` entries. Nothing here is read
off documentation or inferred from the running site. Cross-checks against the Flask source are
labelled as such.

---

## TL;DR — the five things that change a migration decision

1. **Product titles are not unique. 122 of 348 entries (35%) collide on a slugified title** — 25
   entries are literally called "Lunar New Year Decoration". Slug-based product URLs are impossible
   without a disambiguator. See [§6](#6-titles-and-url-slugs).
2. **`price` exists on 22 of 348 entries (6.3%).** 326 products have no price at all. The store is a
   catalogue, not a shop — pricing UI must be built for absence as the normal case, not the edge
   case. See [§5](#5-price).
3. **`category2` is a dead field with one meaningful value.** 301 of 348 entries leave it null; 37
   set it to a value that duplicates or contradicts `category`; 6 set a **typo** (`office-stationey`);
   and exactly **one** entry carries `discount` — so the homepage "Discount Items" carousel renders
   a single product. See [§4](#4-category2--what-it-is-actually-for).
4. **Every entry has exactly one image — min 1, max 1, median 1.** The detail page's Bootstrap
   carousel, which loops `image[1:]`, is therefore empty for all 348 products. The carousel is dead
   code. See [§7](#7-image).
5. **No width transformation is baked into any image URL** — only `f_auto,q_auto`. The grid ships
   800×800 or 1600×1600 source images. Measured: one grid thumbnail is **74 KB**; the same URL with
   `w_400` added is **31 KB**. Cloudinary should keep doing the resizing (it is one URL-segment
   away); Astro's image optimiser has nothing to add and would only proxy. See [§7](#7-image).

Plus one structural surprise the ticket did not anticipate: **there are three content types, not
one**, and the second one (`umbrellaProduct`, 327 entries) is a half-built variant-grouping layer
that no code reads and whose links are 26% broken. See [§9](#9-the-other-two-content-types).

---

## 1. Space shape

| Fact | Value |
|---|---|
| Environment | `master` |
| Locales | **exactly one: `en-US`** ("English (United States)"), default, `fallbackCode: null` |
| **No `zh-HK` locale exists** | confirmed — `/locales` returns `total: 1` |
| Content types | **3** (`samAndCoProducts`, `umbrellaProduct`, `categoryType`) |
| Total published entries | **676** (348 + 327 + 1) |
| **Contentful Assets** | **0** — `/assets` returns `total: 0`. All imagery is external Cloudinary. |
| Published `samAndCoProducts` | **348** ✅ matches the ticket's 324+24 estimate exactly |
| Entry `createdAt` range | 2021-02-28 → 2026-08-01 |
| Entry `revision` range | 1 → 7 |
| Entry tags / taxonomy concepts | `metadata.tags` present on all 348 entries but **empty on all 348**; `metadata.concepts` likewise |

**Consequence for i18n:** the zh-HK follow-up cannot start from Contentful field localisation — the
locale does not exist and no field on any content type has `localized: true`. Translation would have
to be added to the space first, or handled outside Contentful. This confirms the out-of-scope
framing in ticket 03 but rules out the "just turn on the locale" shortcut.

---

## 2. `samAndCoProducts` — every field

From `/content_types` (`sys.id: samAndCoProducts`, revision 51, `displayField: title`, no description).
There are **10 fields**, not the 5 the Flask app reads.

| # | Field ID | Name | Type | Required | Localized | Validations | **Entries populated / 348** |
|---|---|---|---|---|---|---|---|
| 1 | `title` | title | `Symbol` | ✅ **yes** | no | — | **348 (100%)** |
| 2 | `price` | price | `Number` | no | no | — | **22 (6.3%)** |
| 3 | `originalPrice` | original Price | `Integer` | no | no | — | **0 (0%)** |
| 4 | `category` | category | `Symbol` | ✅ **yes** | no | **none** | **348 (100%)** |
| 5 | `category2` | category 2 | `Symbol` | no | no | **none** | **47 (13.5%)** |
| 6 | `image` | image | `Object` | ✅ **yes** | no | — | **348 (100%)** |
| 7 | `featured` | featured | `Boolean` | no | no | — | 112 set (**1 true**, 111 false) |
| 8 | `categories` | categories | `Array<Symbol>` | no | no | `in: [office-stationery, lifestyle, seasonal-products, children, art-supplies]` | **51 (14.7%)** |
| 9 | `variants` | variants | `Array<Symbol>` | no | no | none | **0 (0%)** |
| 10 | `isUmbrellaProduct` | Is Umbrella Product | `Boolean` | no | no | — | 134 set (**23 true**, 111 false) |

Notes that matter:

- **`image` is type `Object`, i.e. free-form JSON.** Contentful enforces nothing about its shape.
  Every safety property in [§7](#7-image) is a property of the *data as it happens to be today*,
  not a schema guarantee. A future editor can put anything there.
- **`category` has no validation.** It is a bare `Symbol`. Contentful will accept any string. It is
  required, so it is never null — but nothing stops a typo. Contrast field 8.
- **`categories` (the plural array) is the field that actually has the whitelist** — the five valid
  slugs. It is the schema's own statement of the intended taxonomy, and it is populated on only 51
  entries. It looks like an abandoned migration from `category`/`category2` to a proper multi-value
  field. Where both are set, **they never disagree (0 of 51 conflicts)** — `categories` is always
  `[category]`.
- **`originalPrice` and `variants` are populated on zero entries.** `originalPrice` is read by
  `public/static/js/discount-display.js:106` to render a `<strike>` original price; that branch has
  never executed. Both fields are safe to drop from the migration's type model.
- **`featured` is true on exactly one entry** (`3cNXsYyK3CHfB8n4VlWuXq`, "Tombow MONO CR5 5x12mm
  Correction Tape Refill"). No Flask route or template reads `featured` at all. If the new site wants
  a featured rail, the data does not exist yet.

---

## 3. `category` — the real distribution

All 348 entries have a `category`, and **every value is one of the five expected slugs.** No typos,
no nulls, no surprises in this field.

| `category` value | Count | Share | Linked from `store.html`? |
|---|---:|---:|---|
| `office-stationery` | **171** | 49.1% | ✅ line 24 |
| `seasonal-products` | **84** | 24.1% | ✅ line 22 |
| `art-supplies` | **77** | 22.1% | ✅ line 23 |
| `lifestyle` | **10** | 2.9% | ✅ line 26 |
| `children` | **6** | 1.7% | ✅ line 25 |
| | **348** | 100% | |

**Answering the ticket directly:**

- **Categories with no link: none.** All five in-use values are linked.
- **Links pointing at empty categories: none.** All five links resolve to ≥1 product.
- But two are nearly empty: **`children` has 6 products and `lifestyle` has 10.** At the current
  `PRODUCT_LIMIT = 36` those are single-page categories with a mostly-blank grid. Worth a design
  decision (merge, hide, or accept) rather than porting the five-link row unexamined.
- `store.html:26` has a **class/label mismatch**: `<h4 class="entertainment">` links to
  `query='lifestyle'`. `public/static/js/app.js:401-411` dispatches on the CSS class, and it has no
  `entertainment` branch — so the Lifestyle filter is inert in the JS path. (Both `app.js` and
  `discount-display.js` also carry a dead `entertainment` label branch, and `app.js:401-411` has no
  `lifestyle` branch at all.) `entertainment` appears **0 times** in the data.

**Query semantics, verified:** `products.py` filters with `fields.category[match]`, which is
Contentful full-text matching rather than equality. I checked whether that leaks across categories —
it does not. For all five slugs, `fields.category[match]=X` and `fields.category=X` return
**identical totals** (84/84, 77/77, 171/171, 6/6, 10/10). The new implementation can safely use
strict equality (`fields.category=`), which is the more predictable choice.

---

## 4. `category2` — what it is actually for

**Verdict: it is a second taxonomy field that was never finished, plus exactly one entry using it as
a discount flag. It is doing double duty, and it is doing both jobs badly.**

Full value distribution, all 348 entries:

| `category2` value | Count | What it is |
|---|---:|---|
| *(absent / null)* | **301** | 86.5% of the catalogue |
| `office-stationery` | 28 | taxonomy slug |
| `art-supplies` | 8 | taxonomy slug |
| **`office-stationey`** | **6** | **typo** — missing the `r` in "stationery" |
| `children` | 2 | taxonomy slug |
| `seasonal-products` | 2 | taxonomy slug |
| **`discount`** | **1** | flag |

Cross-tabulated against `category`, which is what reveals the intent:

| `category` | `category2` | Count | Reading |
|---|---|---:|---|
| office-stationery | *null* | 134 | |
| seasonal-products | *null* | 82 | |
| art-supplies | *null* | 69 | |
| office-stationery | office-stationery | **27** | **redundant — same value twice** |
| lifestyle | *null* | 10 | |
| office-stationery | art-supplies | 7 | genuine second category |
| art-supplies | **office-stationey** | 6 | genuine second category, **misspelled** |
| children | *null* | 6 | |
| office-stationery | children | 2 | genuine second category |
| seasonal-products | seasonal-products | **2** | **redundant** |
| art-supplies | office-stationery | 1 | genuine second category |
| **office-stationery** | **discount** | **1** | **the flag** |
| art-supplies | art-supplies | **1** | **redundant** |

So of the 47 entries that set `category2`:

- **30 (64%) just repeat `category`** — no information.
- **16 (34%) express a genuine second taxonomy membership**, of which **6 are unusable because of the
  `office-stationey` typo** (all 6 are `art-supplies` products meant to also be office stationery:
  Staedtler Yellow Pencil 134 2b, v-Tech fabric Glue, Stype Hobby Art Knife, Stablio Easygraph HB
  pencil, Staedtler Noris Club Jumbo 119 HB, Staedtler Noris Club 12 pencil set).
- **1 (2%) is the discount flag.**

**How the code uses it — both ways at once, which is why it is confusing:**

- `products.py:get_discount_items()` queries `fields.category2[match]: 'discount'` → **flag**.
- `public/static/js/app.js:125-135` and `discount-display.js:91-101` run `category2` through the
  *same* value→label switch as `category` (`office-stationery` → "Office Stationery" etc.) → **taxonomy**.
- `templates/store.html:38-39`, `index.html:66-67` and `detail.html:41-42` render `{{product.category}}`
  and `{{product.category2}}` as two adjacent bare `<h4>`s → **taxonomy**, badly presented.

**Verified consequence:** `fields.category2[match]=discount` returns `total: 1`. The homepage
"Discount Items" section renders exactly **one** product: `SxQOn1c1toLA16dyMyPv0`, "Double A Premium
White Paper(A4)" (`category: office-stationery`), created 2021-03-11. There is no discount price on
it — it has no `price` and no `originalPrice`, so the strike-through markup in
`discount-display.js:107` cannot fire either. **The homepage's discount feature is, in production
data, one unpriced ream of copier paper.**

**Migration recommendation:** do not port `category2` as a rendered field. The honest model is
`categories: string[]` — the field Contentful already validates. Fold `category` + a *corrected*
`category2` into it (this converts 16 entries to genuinely multi-category, once the typo is fixed),
and represent discount as a separate boolean/flag or drop the homepage section until there is real
discount data. Porting `category2` as-is means shipping a second bare heading that is blank on 87% of
products, duplicated on 8.6%, and misspelled on 1.7%.

---

## 5. `price`

| Fact | Value |
|---|---|
| Contentful type | `Number` (decimal-capable), **not** required |
| Actual JSON type in every populated entry | **integer** (22/22; no floats, no strings) |
| Entries with `price` | **22 of 348 (6.3%)** |
| Entries **missing** `price` | **326 of 348 (93.7%)** |
| Range | **10** to **170** |
| Currency stored in Contentful | **none** — bare number, no unit, no currency code |
| Currency in the UI | **`HKD` hardcoded in JS**: `'HKD ' + product.price` (`app.js:140`, `discount-display.js:110`) |
| `originalPrice` populated | **0 of 348** |

All 22 priced entries, for reference:

| Entry ID | Title | `price` |
|---|---|---:|
| `4FJfN6dnk5gOdFwoQYxyGf` | West Star Heavy Duty Magnet 20mm | 28 |
| `4I5KyHbQa8nfV7gHgk7Qhd` | West Star Heavy Duty Magnet 25mm | 35 |
| `5A6eUgE8VHLn4e2QPPc0YE` | West Star Heavy Duty Magnet 15mm | 20 |
| `2UPGV1qcwflgE34aJ7kiiV` | SONIC Super Color Magnet Blue | 39 |
| `3WhRIzB3RIT77Cg4AMfwps` | SONIC Super Color Magnet Yellow | 39 |
| `5P3od5svjnYoTWbpdO9x1j` | SONIC Super Color Magnet White | 39 |
| `4UI2PQ5gS3jwo55QR0rSBH` | SONIC Super Color Magnet Red | 39 |
| `3VeJaeUhZuGw4TFJ2OVYJu` | SONIC Super Color Magnet Green | 39 |
| `1rThWboocHktTNOWgRTaaI` | Multiple Designs Motifs(400 Stickers) | 35 |
| `ZCzNVy5qsQb3vz1uoke6O` | Eatser Decoration | 10 |
| `7h0pZLJRBZdcb0HLRo5Cff` | Eatser Decoration | 98 |
| `6FR2J93PhqYcvKPTxuNq5D` | Straw hat | 79 |
| `1217GLppfh37ZKzCdX1CHe` | Straw hat | 49 |
| `6sGr514hkwhHBfVpERc8O4` | Straw hat | 39 |
| `4tW9FeCTkRYGwlHziyrcfY` | Basket(Small) | 19 |
| `35AbyIJ4okbkaEBZL1NNHv` | Basket(Medium) | 29 |
| `8PVEoWNueMMAy3h4kkvQ3` | Basket(Large) | 49 |
| `1ga5GHmmAjCOuBAfPo1VPT` | Painting Egg | 39 |
| `2UBhhdNv4a0ICACBwN6K5Z` | AVERY Zweckform Photo Corners Conis Photo 250pcs | 35 |
| `35AhUHFoBp9FvVEwiTkIo6` | SEED SUN Radar Eraser | 15 |
| `1xN336HGCiumTAXbi5Jf4b` | FUJIFILM Choice A4 High Opacity Copy Paper 80gsm | 28 |
| `zhNlI87mvHKM8cTYC6TeB` | FUJIFILM Choice A4 …80gsm (5x500 sheets, Incl. Delivery fee) | 170 |

**Format inconsistency:** none *within* the field — every value is a clean small integer. The
inconsistency is **at the boundary**: the field is a decimal `Number` in the schema, currency is
implied not stored, and one title (`…Incl. Delivery fee`) smuggles a pricing qualifier into the
product name.

**Consequences for the templates:**

- `store.html:40`, `index.html:68`, `detail.html:43` render `{{product.price}}` unguarded. Jinja2
  prints an empty string for the missing attribute, so **326 of 348 product cards currently show a
  blank `<h4>`** where a price would be. This is the swallowed-error pattern the ticket suspected,
  and the new templates must decide explicitly: hide the element, or show "Call for price" / the
  existing "give us a call" affordance.
- A `price ?? null` type is mandatory; a non-nullable `number` will not model this data.
- Currency belongs in the presentation layer (HKD), matching what the JS already does — but it should
  be a constant, not a string literal in two files.

---

## 6. Titles and URL slugs

| Fact | Value |
|---|---|
| Entries with `title` | 348 / 348 — the field is required, so **never missing** |
| Empty or whitespace-only titles | **0** |
| Titles with leading/trailing whitespace | **3** (need `.trim()`) |
| Title length | min 3, max 83 chars |
| Titles containing CJK/Japanese characters | **2** ("3M Post-it ふせん(小)", "Tombow MONO zero ホルダー消しゴム") |

**The finding that matters: titles are not unique.**

Lower-cased and trimmed, **30 titles are shared by more than one entry, covering 122 of 348 entries
(35.1%)**. Slugifying (`[^a-z0-9]+` → `-`) produces the same 30 collisions covering the same 122
entries — slugification neither creates nor resolves any collision, and no title slugifies to empty.

Worst offenders:

| Slug | Entries sharing it |
|---|---:|
| `lunar-new-year-decoration` | **25** |
| `2026-diary` | 9 |
| `2027-traditional-calendar` | 7 |
| `wedding-red-pocket` | 6 |
| `year-of-the-horse-decoration` | 6 |
| `dragon-boat-festival-decoration` | 5 |
| `bantex-strong-line-folder` | 4 |
| `year-of-the-horse-red-pocket` | 4 |
| `mothers-day-card` | 4 |
| `fathers-day-card` | 4 |
| `2027-diary` | 4 |
| `sdi-cutter-knife`, `straw-hat`, `seed-radar-twist-style-eraser`, `ping-on-bun`, `party-candles`, `fan` | 3 each |
| …14 more at 2 each | |

**Migration consequence — this is a routing decision, not a nicety.** The current site already
routes by opaque ID (`/detail/<product_id>`, `main.py:104`), and that is the only thing that works
with this data. Options:

- Keep ID-only URLs: `/product/<sys.id>` — ugly but correct, zero risk.
- Hybrid `/product/<slug>-<sys.id>` — readable and unique; the ID disambiguates the 122 collisions.
- **Pure slug URLs are not available** without editorial work to rename ~92 entries.

Note `sys.id` is 22 chars on 309 entries and 21 chars on 39 — do not assume a fixed-width ID.

---

## 7. `image`

### Shape

`image` is declared as Contentful type **`Object`** (arbitrary JSON), required. In practice, on all
348 entries it is a **JSON array of exactly one object**:

```jsonc
{
  "url":                  "http://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1614684710/samAndCoProducts/art-supplies/artline_oil_pastel_24_mx74va.png",
  "secure_url":           "https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1614684710/samAndCoProducts/art-supplies/artline_oil_pastel_24_mx74va.png",
  "original_url":         "http://.../image/upload/v1614684710/....png",   // no transform
  "original_secure_url":  "https://.../image/upload/v1614684710/....png",  // no transform
  "raw_transformation":   "f_auto,q_auto",
  "public_id":            "samAndCoProducts/art-supplies/artline_oil_pastel_24_mx74va",
  "version":              1614684710,
  "format":               "png",
  "width":                800,
  "height":               800,
  "bytes":                704072,
  "resource_type":        "image",
  "type":                 "upload",
  "created_at":           "2021-03-02T11:31:50Z",
  "tags":                 [],
  "metadata":             [],
  "duration":             null
}
```

### Counts

| Fact | Value |
|---|---|
| `image` present | **348 / 348** |
| `image` is a JSON array | **348 / 348** (never an object, never a string) |
| **Images per entry** | **min 1, median 1, max 1** — every single entry has exactly one |
| Entries with **zero** images | **0** |
| Distinct `secure_url`s | **338** — 10 URLs are reused by 2 entries each, so **20 entries share an image with another entry** (all Zhang Xiao Quan / Warrior scissors variants) |
| Cloudinary cloud | one cloud, all 348 |
| `resource_type` / `type` | `image` / `upload` on all 348 |
| `format` | **`png` on all 348** — the *stored* asset is always PNG |
| `duration` | `null` on all 348 (no video) |

**Three key-set variants exist** (the `image` field is free-form JSON, so shape drifted over time):

| Keys | Entries |
|---|---:|
| baseline 17 keys | 291 |
| baseline + `original_transformed_url` | 44 |
| baseline + `original_transformed_url`, **minus `duration`** | 13 |

So `duration` is absent on 13 entries and `original_transformed_url` present on 57. Also `tags` is
`[]` on 343 and `null` on 5; `metadata` is `[]` on 233 and `{}` on 115. **A Zod/valibot schema must
mark `duration`, `tags`, `metadata` and `original_transformed_url` optional/nullable**, or 57+
entries will fail validation at build time. Only these are load-bearing and universal:
`secure_url`, `public_id`, `version`, `format`, `width`, `height`, `bytes`, `resource_type`, `type`.

### The dead carousel

`main.py:106-110` builds the gallery as `product.image[index] for index in range(1, len(product.image))`.
With `len(product.image) == 1` on every entry, `range(1, 1)` is empty. **The Bootstrap carousel in
`detail.html:19-36` renders one slide and two inert prev/next buttons on all 348 detail pages.**
Do not port the carousel; port a single image. (Do keep the data shape as an array — the field is
free-form and a future editor could add a second image.)

### Baked-in Cloudinary transformations

Every `secure_url` carries **format+quality automation only — no resizing, no cropping, no DPR**:

| `raw_transformation` | Entries |
|---|---:|
| `f_auto,q_auto` (comma form) | **237** |
| `f_auto/q_auto` (slash form) | **111** |

Both are semantically identical to Cloudinary; they are two spellings of the same thing produced by
different upload tooling. **A naive string-replace to inject a width must handle both forms** — or,
better, rebuild the URL from `public_id` + `version` + `format`, all of which are in the object.

Source dimensions:

| | min | median | max |
|---|---:|---:|---:|
| width | 800 | **800** | 1615 |
| height | 800 | **800** | 1615 |
| bytes (stored PNG) | 108 KB | **490 KB** | 2.79 MB |

Most common sizes: **800×800 (219 entries)**, **1600×1600 (113)**, 1024×1024 (4), 1512×1512 (4), the
rest one-offs. All 348 are **square**. Total stored PNG weight across the catalogue: **278 MB**.

### Measured delivery cost — the number that decides the image strategy

I fetched the same asset four ways (`curl -I`, Chrome-like `Accept: image/avif,image/webp`):

| URL | Content-Type | **Bytes over the wire** |
|---|---|---:|
| `original_secure_url` (no transform) | `image/png` | **704,072** |
| stored `secure_url` (`f_auto,q_auto`), legacy client | `image/png` | 550,123 |
| **stored `secure_url`, modern browser** | **`image/webp`** | **74,314** |
| stored `secure_url` **+ `w_400`**, modern browser | `image/webp` | **31,214** |

Readings:

- `f_auto,q_auto` is already doing the heavy lifting: 704 KB → **74 KB**, a 90% cut, with correct
  format negotiation per client. Nothing needs fixing there.
- **But there is no `w_`.** A 36-card grid ships 36 × ~74 KB ≈ **2.6 MB** of images, every one of
  them 800px or 1600px wide, to render cards that are a few hundred px on screen.
- Adding a single `w_400` segment cuts a thumbnail to **31 KB** → the same grid becomes **~1.1 MB**,
  a 58% reduction, for a one-line URL transform and no build-time work.

**Recommendation — Cloudinary should keep owning resizing, not Astro.** Reasons, in order of weight:

1. **There are no Contentful Assets (0)** and no local image files. Astro's `<Image>` optimiser
   works on local imports or, for remote URLs, requires `image.domains`/`remotePatterns` plus
   downloading and re-encoding 278 MB of PNGs at build time — paying a large build cost to duplicate
   work Cloudinary already does better and per-client.
2. `f_auto` gives **per-request** format negotiation (webp/avif/png). A build-time optimiser must
   commit to a fixed set of outputs.
3. The needed win is one URL segment (`w_400`, `w_800`, plus `srcset` via `w_` + `dpr_`), not a
   pipeline.
4. Use `@astrojs/…`-agnostic plain `<img srcset>` (or a tiny `cloudinaryUrl(image, {w})` helper) and
   set `width`/`height` from the stored `width`/`height` fields to prevent CLS — those fields are
   present and correct on all 348 entries.

**Gotcha:** the `url` field is `http://` on all 348 entries (and `original_transformed_url` too, on
the 57 that have it). Only `secure_url` / `original_secure_url` are HTTPS. The Flask filter already
uses `secure_url` (`main.py:22`); keep that. Never read `url`.

---

## 8. Data irregularity summary — the exact counts templates must handle

| Irregularity | Count | / 348 | Notes |
|---|---:|---:|---|
| Missing `title` | **0** | 0% | required field |
| Title with stray whitespace | 3 | 0.9% | trim on read |
| **Duplicate/colliding title slug** | **122** | **35.1%** | 30 distinct collision groups; blocks slug URLs |
| Missing `image` | **0** | 0% | required field |
| `image` array empty | **0** | 0% | |
| Entries with >1 image | **0** | 0% | carousel is dead code |
| Shared image with another entry | 20 | 5.7% | |
| `image` object missing `duration` | 13 | 3.7% | schema must allow |
| `image.tags` is `null` not `[]` | 5 | 1.4% | schema must allow |
| Missing `category` | **0** | 0% | required field; all values valid |
| Invalid `category` value | **0** | 0% | |
| Missing `category2` | **301** | 86.5% | |
| `category2` typo (`office-stationey`) | **6** | 1.7% | |
| `category2` merely repeats `category` | 30 | 8.6% | |
| **Missing `price`** | **326** | **93.7%** | the dominant case |
| Missing `originalPrice` | **348** | 100% | field unused |
| Missing `categories` array | 297 | 85.3% | |
| `categories` disagreeing with `category` | **0** | 0% | |
| `variants` populated | 0 | 0% | field unused |

**In short: the required fields are genuinely reliable (title, category, image — 100%, valid, and
one image each). Every optional field is effectively empty.** The defensive `try/except` in the
Flask code was defending against `price` and the phantom second image, not against missing titles or
categories. The new templates need one deliberate decision — *what a card looks like with no price* —
and can otherwise treat title/category/image as guaranteed, while still validating them at the
boundary because `image` is schema-free JSON.

---

## 9. The other two content types

The ticket assumed one content type. There are three, and the second is a significant surprise.

### `umbrellaProduct` — 327 entries, read by nothing

Created 2022-02-27 (a year after `samAndCoProducts`). Description: *"A product that encapsulates
variants of the same products"* — an attempt to solve exactly the duplicate-title problem in §6.

| Field | Type | Required |
|---|---|---|
| `productReferences` | `Array<Link<Entry>>` (no validation on target type) | no |
| `productName` | `Symbol` | no |
| `categories` | `Array<Symbol>`, `in: [office-stationery, lifestyle, seasonal-products, children, art-supplies]` | no |
| `featured` | `Boolean` | no |

Measured across all 327 published entries:

- **Zero references to it anywhere in the codebase.** `grep` finds `umbrellaProduct` in no Python,
  template, or JS file. It is invisible to the live site.
- **318 of 327 group exactly one product** — i.e. they are not grouping anything. Only **9 group
  more than one** (histogram: 1×318, 2×4, 3×2, 4×1, 5×1, 7×1). The grouping job is ~3% done.
- **348 links total, of which 89 (25.6%) do not resolve** to any of the 348 published products —
  they point at unpublished or deleted entries. One (`2SRQyw7LjRGOXHrDCARpDC`) points at the
  `categoryType` entry instead of a product, which the schema permits because `productReferences`
  has no link-type validation.
- **112 of 348 published products (32%) are referenced by no umbrella at all.**
- 9 entries have `productName: null` and no `categories`.
- `featured` is true on 2.

**Migration recommendation: do not port `umbrellaProduct`.** It is a stalled, 26%-broken data model
that no user-visible behaviour depends on. If variant grouping is wanted, the migration is a chance
to design it properly — and the *problem* it was reaching for (25 entries called "Lunar New Year
Decoration") is real and worth solving. Flag it to the content owner before deleting anything.

### `categoryType` — 1 entry

| Field | Type | Required |
|---|---|---|
| `categoryName` | `Symbol` | no |
| `slug` | `Symbol` | **yes** |

Exactly **one** published entry: `YezusVJU0F4nohccYZKSd` = `{categoryName: "Office Stationery", slug: "office-stationery"}`.
Created 2021-03-11, never extended to the other four categories, never referenced by any code.
An abandoned attempt at a category registry. **Do not port.** Category labels should be a typed
constant in the codebase — five values that have not changed in five years.

---

## 10. Direct answers to the ticket's bullets

- **Every field on `samAndCoProducts`, type, required** → [§2](#2-samandcoproducts--every-field). 10 fields; 3 required (`title`, `category`, `image`); 2 fields (`originalPrice`, `variants`) populated on zero entries.
- **What `category2` is for** → [§4](#4-category2--what-it-is-actually-for). **Both**, and neither well: an unfinished second taxonomy (16 genuine uses, 6 of them misspelled, 30 redundant) that also carries a single `discount` flag driving a one-item homepage section.
- **Total published entry count** → **348**, confirming ticket 01's estimate. Static prerendering holds.
- **Real categories vs the six hardcoded** → [§3](#3-category--the-real-distribution). All five in-use values are linked; all five links have products. No dead links, no unlinked categories. But `children` (6) and `lifestyle` (10) are near-empty, and `store.html:26` labels Lifestyle with `class="entertainment"`, which the JS filter does not handle.
- **Shape of `image`, images per entry, how many have none, baked-in transformations** → [§7](#7-image). Array of exactly 1 object, 348/348; zero entries with none; `f_auto,q_auto` (or `f_auto/q_auto`) only — **no resizing baked in**.
- **How `price` is stored, how many missing** → [§5](#5-price). `Number`, always integer, no currency (HKD applied in JS); **326 of 348 missing**.
- **Locale configuration, zh-HK present?** → [§1](#1-space-shape). **`en-US` only. No zh-HK. No field on any content type is `localized`.**
- **General data irregularity** → [§8](#8-data-irregularity-summary--the-exact-counts-templates-must-handle).

---

## 11. Concrete follow-ups this audit generates

1. **Routing decision (blocking):** 122 slug collisions rule out slug-only product URLs. Pick ID or slug+ID before any route file is written. → §6
2. **Price-absent UI (blocking):** 93.7% of cards have no price. Design the no-price card deliberately. → §5
3. **Drop `category2` from the rendered model**; migrate to the already-validated `categories` array; fix the `office-stationey` typo on 6 entries (a content edit, not code). → §4
4. **Decide the fate of the homepage Discount section** — it currently has one unpriced product. → §4
5. **Add `w_` to Cloudinary URLs** and set intrinsic `width`/`height`; handle both `f_auto,q_auto` and `f_auto/q_auto` spellings. Measured saving: ~58% of grid image bytes. → §7
6. **Delete the detail-page carousel** — 0 of 348 entries have a second image. → §7
7. **Do not port `umbrellaProduct` or `categoryType`**; raise the 89 broken links and the stalled variant-grouping model with the content owner. → §9
8. **Fix `store.html:26`** `class="entertainment"` / `query='lifestyle'` mismatch. → §3
9. **Validate `image` at the boundary** with `duration`, `tags`, `metadata`, `original_transformed_url` optional — the field is schema-free JSON and 57 entries deviate from the baseline shape. → §7
10. **zh-HK is a content-model change, not a code change** — the locale does not exist and no field is localized. → §1

---

## Sources

All primary. Retrieved 2026-08-19.

| Claim group | Source |
|---|---|
| Schema, field types, required flags, validations | Contentful CDA `GET /spaces/{space}/environments/master/content_types` |
| All entry statistics, distributions, counts | Contentful CDA `GET /entries?content_type=samAndCoProducts&limit=100&skip=0\|100\|200\|300` (348 items, 348 unique ids) |
| Category query semantics | Contentful CDA `GET /entries?…&fields.category[match]=X` vs `…&fields.category=X`, all five slugs |
| Discount count | Contentful CDA `GET /entries?…&fields.category2[match]=discount` → `total: 1` |
| Locales | Contentful CDA `GET /locales` → `total: 1`, `en-US` |
| Asset count | Contentful CDA `GET /assets?limit=1` → `total: 0` |
| Umbrella/category type entries | Contentful CDA `GET /entries?content_type=umbrellaProduct` (327) and `…=categoryType` (1) |
| Image delivery bytes and formats | `curl -I` against `res.cloudinary.com`, with and without `Accept: image/avif,image/webp` |
| Template/route behaviour | Repo source: `main.py`, `products.py`, `templates/store.html`, `templates/index.html`, `templates/detail.html`, `public/static/js/app.js`, `public/static/js/discount-display.js` |

Credentials were read from `.env` at the repo root and are deliberately not reproduced here; the
space id and delivery token appear nowhere in this document.
