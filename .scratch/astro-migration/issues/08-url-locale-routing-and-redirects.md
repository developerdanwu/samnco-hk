# URL scheme, locale routing, and redirects

Type: grilling
Status: resolved
Blocked by: 03

## Question

> **Ticket 13 settled this, and it cuts the other way.** The live domain is **`samnco-hk.shop`**
> (apex → `www`), serving now. The site is up and presumably indexed, so **SEO continuity is a real
> cost** — changing `/detail/<id>` means real redirects for real traffic.
>
> **Also fix here:** every page currently declares `og:url` and `twitter:url` as
> `https://www.samnco-hk.com/`, a domain that does not resolve. Canonical, OG and Twitter URLs must
> be emitted on `samnco-hk.shop`.
>
> **There is no `slug` field in Contentful.** The content type is `title`, `price`, `originalPrice`,
> `category`, `category2`, `image`, `featured`, `categories`, `variants`, `isUmbrellaProduct`. A
> `slug-id` scheme means deriving the slug from `title` at build time — no content change needed,
> but the slug then shifts if a title is ever edited, so the `id` half must be what actually
> resolves the route.

The current site is live and indexed. Its URLs are `/`, `/about`, `/shop`, `/shop/<category>` and
`/detail/<product_id>`. Adding a second locale forces a decision about all of them at once.

- **How is locale represented?** Prefixed paths for both (`/en/...`, `/zh-hk/...`), or default
  locale unprefixed and Chinese prefixed (`/`, `/zh-hk/...`)? The second keeps every existing
  English URL byte-identical, which matters for the next point.
- **Do the existing URLs survive?** `/detail/<product_id>` uses a raw Contentful entry id — opaque
  and unreadable. A slug would be better for both humans and search engines, but changing it breaks
  every indexed detail URL. **This is the trade-off to settle: SEO continuity versus clean URLs.**
  If URLs change, permanent redirects from every old path are mandatory, and the mapping must be
  generated from Contentful rather than written by hand.
- **Is the category path scheme kept?** `/shop/<category>` is a path segment; a query parameter
  would compose better with search and pagination but changes indexed URLs.
- **How does pagination appear?** Today `?page=N` with 36 per page. The handling in `main.py` is
  buggy and this is **confirmed against the live site**: `skip` is computed as `page * 36`, so the
  landing view (no param) shows products 1–36 while clicking "1" jumps to 37–72. The widget also
  renders 10 pages using `per_page=37`, inconsistent with `PRODUCT_LIMIT = 36`, so **the last page
  link returns an empty grid** — at 348 products, `?page=10` is `skip=360`, past the end. The new
  scheme must not reproduce any of this.
- **Confirmed by the spike (ticket 11):** English unprefixed and `/zh-hk/` prefixed works, and
  `localizeHref()` + `locales` is what emits the `hreflang` alternates below.
- **Locale detection and switching.** Does a first-time visitor get redirected by `Accept-Language`,
  or always land on English with a visible switcher? Redirect-on-detect interacts badly with static
  prerendering and with crawlers; decide deliberately.
- **`hreflang` and canonical tags** for the locale pairs, so the two versions are not treated as
  duplicates.

Resolved when the full route table is written down, old-to-new mapping included.

## Answer

**Keep `sys.id` for detail URLs. Zero redirects needed.** Dan's call, made knowing the site is live
on `samnco-hk.shop` and that slugs would mean real redirect work for real traffic. `slug-id` stays
available later — deriving a slug from `title` at build needs no content change — so this is
reversible, at the cost of the redirects deferred rather than avoided.

### Route table

| EN | zh-HK | Notes |
| --- | --- | --- |
| `/` | `/zh-hk/` | English unprefixed, Chinese prefixed — spike-confirmed (ticket 11) |
| `/about` | `/zh-hk/about` | |
| `/shop` | `/zh-hk/shop` | |
| `/shop/<category>` | `/zh-hk/shop/<category>` | **Path segment kept.** Five categories, all indexed, all resolve |
| `/detail/<sys.id>` | `/zh-hk/detail/<sys.id>` | **Unchanged.** 348 × 2 = 696 prerendered pages |
| `/api/search` | — | Locale-independent, excluded from middleware, `prerender = false` |
| 404 | 404 | |

**No redirect map is required for the migration.** Every existing English URL survives byte-identical.
The apex → `www` redirect already exists at Vercel and stays.

### Decided on evidence rather than referred back

These were open sub-questions; the spike and audit settle them, and none is close enough to be worth
a round trip. Flagging them here so they are visible rather than silent — say so if any is wrong.

- **Pagination stays `?page=N`, but the off-by-one is fixed.** Today `skip = page * 36`, so the
  landing view shows products 1–36 while clicking "1" jumps to 37–72, and the last page link returns
  an empty grid. New behaviour: `?page=N` is 1-based, `skip = (N-1) * 36`, and page 1 is the
  canonical `/shop`. At 348 products that is 10 pages. This **changes what `?page=N` returns**, but
  the current behaviour is a bug and the pages are near-duplicates for indexing purposes.
- **No `Accept-Language` redirect.** It is unavailable on prerendered pages (ticket 03), and
  redirect-on-detect interacts badly with crawlers. Everyone lands on English; the locale switcher is
  visible in the header. Simple, static, and predictable.
- **`hreflang` alternates on every page**, emitted from Paraglide's `locales` + `localizeHref()`, with
  `x-default` pointing at the English URL.
- **Canonical, `og:url` and `twitter:url` emitted on `samnco-hk.shop`.** This fixes a live bug: every
  page currently hardcodes `https://www.samnco-hk.com/`, which does not resolve, so all social
  previews point at a dead domain.
- **`sitemap.xml` and `robots.txt` regenerated**, covering both locales. The versions in `old files/`
  are stale and reference the `.com`.
