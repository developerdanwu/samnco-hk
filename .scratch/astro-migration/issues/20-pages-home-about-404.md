# Pages: home, about, 404

Type: task
Status: resolved
Blocked by: 19

## Question

Home per ticket 05: shop photograph leading (not a product, not the portrait), hero, the three
notes, find-us. **No product section** — the discount block was dropped in ticket 14.

Local images move to `src/assets/` for Astro to optimise (ticket 15); the hero is the **LCP element**
— eager, `fetchpriority="high"`, explicit dimensions.

About reuses the existing copy and the portrait. 404 per ticket 07.

## Answer

**Done and browser-verified in both locales.**

| page | en | zh-hk | images |
| --- | --- | --- | --- |
| home | "Stationery and art supplies, since 1980." | 文具與美術用品，自一九八〇年。 | 4 files, 136 KB |
| about | "About us" | 關於本店 | 3 files, 87 KB |
| 404 | self-localising — see below | | |

No console errors, no hydration warnings, status chip correct on every page.

### Home

Leads with the **shop photograph**, not a product — Astro converted it to `.webp`, served
`loading="eager" fetchpriority="high"` with explicit dimensions as the **LCP element**. No product
section: the discount block was dropped in ticket 14, so the homepage is hero, three notes, find-us.

**The Google Maps embed is ported, not dropped** — it is existing functionality. It carries
`loading="lazy"`, so the third-party frame only loads when scrolled to and costs nothing above the
fold.

### About — copy ported, not invented

The existing `templates/about.html` copy is genuinely good and specific ("launched by husband and
wife duo", "a second home to a family", "when you're happy, we're happy"), so it was **ported
verbatim** in English. **The Chinese is newly drafted and needs Dan's review** — the approved
catalogue in ticket 07 covered chrome strings and never included About body copy. Six new keys.

**⚠ A claim worth checking:** the About text says *"We provide local delivery services throughout
Hong Kong on over 10,000 products, and we welcome any returns"*. The rest of the site says nothing is
buyable online. Delivery is not the same as online ordering, so this is not necessarily a
contradiction — but it is a customer-facing promise from the old site that nobody has verified is
still true. **Raised for Dan, not silently changed.**

### 404 — one file, self-localising

Static hosts serve **one** `404.html` for every unmatched route, so Astro emits `/404.html` rather
than a routable page and a `/zh-hk/404` counterpart is meaningless. A bad `/zh-hk/` URL would
therefore have shown English.

Fixed by exploiting how 404s actually work: **the host does not rewrite the URL**, so
`window.location` still says `/zh-hk/…` and Paraglide's client resolves the locale from it. A small
script re-reads the messages. Verified by serving the real `404.html` at `/zh-hk/nope`: title
**找不到此頁**, link **返回產品頁 → /zh-hk/shop**, `lang="zh-hk"`.

**Known limit, stated rather than hidden:** the header and footer stay in the build locale on the
404. Localising those needs host-level routing to a second 404 document, which a static 404 does not
support.

The locale parity check now **exempts 404** with a comment saying why — it is host-special-cased,
not a normal route.
