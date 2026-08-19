# Meta, hreflang, sitemap, robots

Type: task
Status: resolved
Blocked by: 19

## Question

Per ticket 08 and 13.

**Canonical, `og:url` and `twitter:url` on `samnco-hk.shop`** — the live site currently hardcodes
`www.samnco-hk.com`, which does not resolve, so every share preview points at a dead domain. This is
a real bug being fixed, not a port.

`hreflang` alternates from Paraglide `locales` + `localizeHref()`, with `x-default` on English.
Regenerate `sitemap.xml` and `robots.txt` covering both locales — the versions in `old files/` are
stale and reference the `.com`. Per-page titles and descriptions from the approved catalogue.

## Answer

**Done.** Verified across all 747 built pages.

| | |
| --- | --- |
| pages still referencing `samnco-hk.com` | **0** — the live site has it on every page |
| sitemap URLs | **746**, all on `www.samnco-hk.shop`, 373 under `/zh-hk/` |
| 404 excluded from the sitemap | yes |
| `robots.txt` | allows all, disallows `/api/`, points at `sitemap-index.xml` |
| canonical appears in its own alternates | yes, on every page checked |

Per-page titles and descriptions come from the approved catalogue; detail pages compose the product
title and category. `og:locale` is `en_HK` / `zh_HK`. The OG image is generated at build from the
shop photograph at 1200×630 with explicit dimensions.

### Two defects found by checking rather than assuming

**1. HTML comments ship.** An explanatory comment I had written into the `<head>` contained the
string `www.samnco-hk.com`, so the dead domain was being emitted on **every page of the new site** —
in the very change whose purpose was removing it. Moved into frontmatter, where it is a JS comment
and is not emitted. The lesson generalises: anything in an `.astro` template body reaches the user,
including notes to other developers.

**2. hreflang pointed at non-canonical URLs.** `localizeHref()` **drops the trailing slash** on the
prefixed locale while Astro's canonical keeps it, so every Chinese page was advertised as
`/zh-hk/detail/<id>` while its own canonical said `/zh-hk/detail/<id>/`. hreflang requires
reciprocity against canonical URLs; mismatched pairs are commonly ignored outright. Alternates are
now normalised, and the check is now explicit: **the page's canonical must appear in its own
alternate set** — true on English detail, Chinese detail and the Chinese homepage.
