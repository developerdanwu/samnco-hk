# Audit the Contentful content model

Type: research
Status: resolved
Blocked by: 01

## Question

What is actually in the `samAndCoProducts` content type, and how much of it is there? The Flask code
reads `title`, `category`, `category2`, `price` and `image` — but it reads them defensively
(`get_image` swallows `AttributeError`, the detail page wraps its image loop in try/except), which
suggests the data is irregular.

Establish:

- **Every field** on `samAndCoProducts`, its type, and whether it is required. In particular what
  `category2` is for — the templates render it as a bare heading next to `category`, and the
  homepage uses `fields.category2[match]: 'discount'` to select discount items, so it appears to be
  doing double duty as both a taxonomy and a flag.
- **Total published entry count.** This decides whether pre-rendering a page per product at build
  time is reasonable, and was the fact that could not be obtained during charting.
- **The real category values in use**, versus the six hardcoded in `store.html`
  (`seasonal-products`, `art-supplies`, `office-stationery`, `children`, `lifestyle`, plus All).
  Are there categories with no link, or links pointing at categories with no products?
- **The shape of `image`** — an array of objects with `secure_url`. How many images does a typical
  entry have, how many have none at all, and what Cloudinary transformations are already baked into
  the stored URLs.
- **How `price` is stored** — number or string, currency included or implied, how many entries are
  missing it.
- **Locale configuration** on the space: which locales exist, and whether a zh-HK locale is already
  defined (relevant to the out-of-scope full-translation follow-up, not to this effort).
- **Data irregularity in general**: entries missing a title, an image, or a category, since the new
  templates must handle them deliberately rather than by swallowed exception.

## Known so far — do not re-derive

Established from the live production site while working ticket 01, without Contentful access:

- **348 published `samAndCoProducts` entries.** Measured by walking `/shop?page=N` on
  `samnco-hk.vercel.app`: `skip=324` returns 24 products and `skip=360` returns none, so
  324 + 24 = 348. This is the entry-count fact charting could not obtain.
- **Static prerendering is comfortably viable at this size** — 348 products across 2 locales is
  ~700 pages, a non-issue for build time. The charting assumption holds.
- **The live pagination widget renders 10 pages** (`per_page=37` in `main.py`, inconsistent with
  `PRODUCT_LIMIT = 36` — one of the pagination bugs noted in ticket 08).

Beware: the string "over 10,000 products" appears in the site's meta description and refers to the
physical shop's stock, **not** the Contentful catalogue. It is not an entry count.

Everything else in the question above still needs the audit.

## Answer

**Audited empirically against the live CDA** — all 348 entries paged, plus content types, locales,
assets, and all 327 `umbrellaProduct` entries. Full findings:
[`../research/02-contentful-audit.md`](../research/02-contentful-audit.md).

Five findings change migration decisions:

1. **Slug URLs are impossible.** 122 of 348 entries (35%) collide on a slugified title — 25 are
   literally "Lunar New Year Decoration". Routing must use `sys.id`, or a `slug-id` hybrid. This
   settles the open trade-off in ticket 08 on technical grounds rather than taste.
2. **`price` exists on only 22 of 348 entries (6.3%).** 326 have none; `originalPrice` on zero.
   Values are bare integers with no currency (HKD is hardcoded in JS). **The no-price product card
   is the normal case**, not the edge case — today it renders an empty `<h4>`. Feeds ticket 05.
3. **`category2` is both a taxonomy and a flag, and it is broken.** 301 null, 30 merely repeat
   `category`, 16 genuine second categories (6 of them misspelled `office-stationey`), and exactly
   **one** entry set to `discount`. The homepage "Discount Items" section therefore renders a single
   unpriced ream of copier paper. There is an already-whitelisted `categories` array to migrate to.
   Raised as ticket 14.
4. **Every entry has exactly one image** (min = max = 1). The detail-page carousel loops
   `image[1:]`, so it is **dead code on all 348 products**. No width transform is baked into the
   stored URLs — only `f_auto,q_auto` (237) or `f_auto/q_auto` (111). Measured: a thumbnail is 74 KB
   webp, adding `w_400` makes it 31 KB. There are **zero Contentful Assets**, so Astro's image
   optimiser would download and re-encode 278 MB of PNGs at build for no gain. Raised as ticket 15.
5. **Two undiscovered content types.** `umbrellaProduct` (327 entries) is a stalled variant-grouping
   layer that no code reads — 89 of 348 links (26%) do not resolve and 318 group a single product.
   `categoryType` has 1 entry. **Port neither.**

Also confirmed: `category` is 100% clean and valid, and all five hardcoded store links resolve to
non-empty categories — though `children` has 6 products and `lifestyle` 10. Locale is **`en-US`
only, with no localized fields**, so product translation is a content-model change, not a toggle.
