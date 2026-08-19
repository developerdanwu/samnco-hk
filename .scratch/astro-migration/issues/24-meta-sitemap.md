# Meta, hreflang, sitemap, robots

Type: task
Status: open
Blocked by: 19

## Question

Per ticket 08 and 13.

**Canonical, `og:url` and `twitter:url` on `samnco-hk.shop`** — the live site currently hardcodes
`www.samnco-hk.com`, which does not resolve, so every share preview points at a dead domain. This is
a real bug being fixed, not a port.

`hreflang` alternates from Paraglide `locales` + `localizeHref()`, with `x-default` on English.
Regenerate `sitemap.xml` and `robots.txt` covering both locales — the versions in `old files/` are
stale and reference the `.com`. Per-page titles and descriptions from the approved catalogue.
