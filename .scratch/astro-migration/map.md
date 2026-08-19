# Map: Astro migration & redesign

Label: `wayfinder:map`
Effort: `astro-migration`
Tracker: local markdown (`.scratch/astro-migration/`)

## Destination

**samnco-hk.shop running on Astro on Vercel — visually redesigned, bilingual EN/zh-HK chrome, at
functional parity with the current Flask site — with the Flask application deleted from the repo.**

Parity means every route and behaviour a visitor can reach today: home with discount items, about,
paginated product grid, category filter, product search, product detail with image gallery, 404.

## Notes

**Execution is carried into this map** — an explicit override of Wayfinder's plan-only default,
agreed at charting. Tickets still resolve decisions first, but the map is not done until the
redesigned Astro site is live on the domain.

Domain: a family-run stationery and art supply shop in Central, Hong Kong — 三和文儀公司 / Sam and
Company, trading since 1980. Sole stakeholder and approver: Dan Wu.

Skills every session should consult: `/grilling` and `/domain-modeling` by default;
`/prototype` and `/design` (Claude Design) for the design-direction work; `/research` for
research tickets.

### Settled at charting

These came out of the charting grill, not from tickets, so they are not in Decisions so far — but
every ticket inherits them.

- **Why**: the site reads as dated and is painful to maintain. *Not* groundwork for e-commerce.
- **CMS**: Contentful stays. The catalogue is treated as effectively frozen, so products
  **prerender at build time**; a Contentful webhook triggers rebuilds. *(Load-bearing assumption —
  if the catalogue turns out to be actively edited with a live expectation, revisit.)*
- **Design**: redesign, not reskin and not rebrand. Brand equity kept — logo, the coral/cream/warm-
  charcoal palette (`#e07d78` / `#f7e1d3` / `#473D3C`), "since 1980", 三和文儀公司. Direction is set
  by a Claude Design prototype that Dan reacts to; the design leads and the component library
  follows.
- **Stack**: Astro + React islands + Tailwind + shadcn/ui, using **Base UI** primitives rather than
  Radix. shadcn is used as **behaviour primitives only** and rethemed hard through Tailwind tokens —
  stock shadcn styling would read as a SaaS dashboard, which is the opposite of the brief.
- **Search**: debounced input → **an Astro API route** → Contentful, with React Query on the client
  (caching per query string, dedupe, previous results held while typing). The Delivery token stays
  server-side. This single endpoint is the only server that survives the Flask deletion.
- **i18n**: Paraglide, **chrome strings only** — nav, footer, headings, buttons. Product content
  stays as-is in Contentful. 三和文儀公司 is the established name and anchors the zh-HK copy; Claude
  drafts the rest for Dan's review.
- **Host**: Vercel. `main.py`, `products.py`, `forms.py`, `ui.py`, `vercel.json`, `Procfile`,
  `requirements.txt`, `.python-version` and `venv/` are all removed by the end of this effort.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Research Paraglide JS on Astro](issues/03-research-paraglide-on-astro.md) — Paraglide 2.x holds,
  wired as a **Vite plugin**, not an integration (`@inlang/paraglide-astro` is deprecated by design).
  Both locales prerender as static routes with **English unprefixed and `/zh-hk/` prefixed, so every
  indexed English URL survives**. React islands need no locale threading. The SSG path is
  undocumented-by-example and must be spiked first (ticket 11); `build.concurrency` must stay at 1.
- [Research the Astro + React + Tailwind + shadcn/Base UI stack](issues/04-research-astro-react-tailwind-shadcn-baseui.md)
  — the stack composes. **Base UI is now shadcn's default primitive**, with zero Radix-only
  components, so nothing needs hand-wrapping; the package is `@base-ui/react` (the old
  `@base-ui-components/react` now fails to install). `output: 'hybrid'` is gone — use `'static'` +
  adapter + `prerender = false` on the search route. Measured island cost of **~138 KB gzip** raised
  the JavaScript-budget decision as ticket 12.
- [Recover Contentful credentials](issues/01-recover-contentful-credentials.md) — recovered by Dan
  from Contentful directly and verified against the CDA: space **"Sam and Company"**, **348**
  published products, locale **`en-US` only**. They could not be pulled from Vercel because they
  were stored as **Sensitive** (write-only by design) — the new project must store them as normal
  encrypted variables. `SECRET_KEY` confirmed dead. Turned up the domain problem now tracked as
  ticket 13.
- [Audit the Contentful content model](issues/02-audit-contentful-content-model.md) — 348 entries,
  audited empirically. **Slugs are impossible** (35% of titles collide), **only 6.3% have a price**,
  **every product has exactly one image** (the detail carousel is dead code), `category2` is broken
  with **exactly one `discount` entry** powering the homepage section, and two content types
  (`umbrellaProduct`, `categoryType`) are stalled and must not be ported. Raised tickets 14 and 15.
- [Spike the Paraglide SSG setup](issues/11-spike-paraglide-ssg-on-astro.md) — **GREEN.** Both
  locales prerender, islands get the right locale with no hydration mismatch, the `/api/` route
  coexists. Found that **raising `build.concurrency` silently corrupts locales** (13 of 122 pages
  wrong, build still exits 0) — default of 1 is safe, regression test kept. Also unblocked
  `shadcn init` (an interactive prompt, not a timeout) and measured **90.6 KB gzip per island page,
  zero JS without one**.
- [Decide the fate of samnco-hk.com](issues/13-domain-fate.md) — **the site was never dark.**
  `samnco-hk.shop` is the live production domain, already on Vercel, apex redirecting to `www`. The
  `.com` genuinely does not resolve but was only ever inferred from stale `og:url` tags in
  `base.html` — which is itself a live bug, since every page points shares at a dead domain.
  Destination amended to `samnco-hk.shop`; **SEO continuity is a real cost again**, not moot.
- [Decide the JavaScript budget](issues/12-javascript-budget.md) — **React everywhere it is
  convenient** (90.6 KB gzip per island page, zero without). In practice that is nav + search only:
  the gallery island is deleted because every product has exactly one image. Home, about and 404
  ship zero JS.
- [Decide the fate of the Discount section](issues/14-discount-section-and-taxonomy.md) — **dropped
  from the homepage** (1 of 348 products flagged). `category2` retired; its 16 genuine values migrate
  into the existing `categories` array as a content edit. A `featured` Boolean already exists on the
  content type if a curated selection is ever wanted.
- [URL scheme, locale routing, and redirects](issues/08-url-locale-routing-and-redirects.md) —
  **`sys.id` kept for detail URLs, so no redirect map is needed**: every existing English URL
  survives byte-identical. English unprefixed, `/zh-hk/` prefixed; `/shop/<category>` path segment
  kept. Pagination's off-by-one fixed; no `Accept-Language` redirect; `hreflang` emitted; canonical
  and OG URLs moved to `samnco-hk.shop`, fixing a live bug.
- [Design direction prototype](issues/05-design-direction-prototype.md) — **"Ledger" chosen**: quiet
  and editorial, warm off-white ground, Newsreader + Karla + Noto Serif HK, **coral demoted to an
  accent** with links darkened to `#B4564F` for contrast. **The homepage leads with a photograph of
  the shop**, not a product — it argues for the visit, which is the only conversion available. The
  locale switcher is a **dropdown**. No price is shown anywhere; no gallery.
  Amended after review: **三和文儀公司 now leads the header**, the accent is the **logo red
  `#CC0000`** (the coral was a 2021 site invention and is retired), the logo is in the design, and
  **mobile is drawn at 390px** across home, grid, detail and menu. An **open/closed status chip**
  was added as an approved scope addition — specified in ticket 16.
  The **footer** was reworked after review — the original dropped the fax number, category links and
  MTR exit that the site already has. Adopted a **sitemap footer** (navigation columns + seven-day
  hours strip + getting-here + a 118px 三和文儀公司 wordmark band), desktop and mobile. No credit
  line, and **no language section** — the Chinese site is the same pages, not extra ones, so the
  locale control lives in the nav and `hreflang` does the SEO work. Confirmed with Dan that the shop
  is framed as **a stationery and art supply store** — the copy already leads with stationery, which
  matches the 171/77 split, so no change follows.
  [Canvas](https://claude.ai/code/artifact/3577f29c-d0bc-4737-acfb-12b3e166365e)
- [Design tokens → Tailwind theme](issues/06-design-tokens-to-tailwind-theme.md) —
  [`design-tokens/global.css`](design-tokens/global.css), **compiled and verified** against real
  Tailwind 4.3.3 + shadcn + Base UI. Neutral ramp re-derived at **hue ~50** (the old cream was a tint
  of the retired coral); **`--radius: 2px`** against shadcn's 10px; **no dark mode**; `--primary` is
  ink, not red. **Caught three muted greys in the approved mockups that fail WCAG AA** — the
  lightest legal text colour is now `paper-650` (#816E67, 4.51:1), so the tokens, not the artboards,
  are authoritative on muted text.
- [zh-HK copy deck](issues/07-zh-hk-copy-deck.md) — **91 messages approved**, complete in both
  locales, compiled and rendered through Paraglide. Established the rule that **times and day names
  are messages, not values**: interpolating a formatted time produced `營業中 — 至7pm`, and the word
  order differs between locales, so language-shaped values can never be concatenated in component
  code. Dropped the meta description's "over 10,000 products" — that is the physical shop, not the
  348-product site.
- [Search UX and the API-route contract](issues/09-search-ux-and-endpoint-contract.md) — measured
  against the live catalogue. **Full-text search tested and rejected**: identical to title-match on
  every real product term, and differs only by dumping whole categories ("office" → 178 of 348).
  Latency is **~270 ms median, up to 530 ms**, so debounce is 300 ms with `AbortController`
  cancellation and hard edge caching (`s-maxage=3600`) as the quota defence. **Chinese queries
  return nothing** — the space is `en-US` only — so a zh-HK-only message explains why. No typo
  tolerance in either approach, which is parity. Search will not work without JavaScript; the
  category links still will.
- [Image pipeline](issues/15-image-pipeline.md) — **the biggest performance win in the migration.**
  The stored URLs carry no width transform, so a shop page ships **6.03 MB of images today**;
  adding `w_400` makes it **0.55 MB, 91% less**, and it is a string edit. Resize in Cloudinary, not
  Astro — there are zero Contentful Assets, so Astro's optimiser would re-encode 278 MB of source
  PNGs per deploy for nothing. Confirmed across all 348 entries: **no missing images, none with more
  than one**, so the **gallery is formally dropped** (no Embla, one island fewer). Local hero/map
  photos move to `src/assets/` as Astro's job; the homepage photo is the LCP element.
- [Open/closed status indicator](issues/16-open-closed-status.md) — the holiday problem is solved:
  **the HK government publishes the list** at `1823.gov.hk/common/ical/en.json` (verified live, no
  key, 2025–2027, **and a Traditional Chinese feed** so the state can name the holiday). Fetched at
  build and baked in, with a checked-in snapshot if the fetch fails. **Fails safe** — past the last
  known holiday it says "check our hours" rather than assuming open. Timezone is
  `Intl.DateTimeFormat` with `Asia/Hong_Kong`, **no date library**. Ships as a plain module script,
  not a React island; the prerendered HTML carries the hours summary so it is never stale.
- [Cutover plan](issues/10-cutover-plan.md) — **same Vercel project**, since the domain and
  certificate are already there and preview deployments make a second project pointless. Two
  findings: the project's **Framework Preset is `undefined`** with no build command (the Python
  function is wired entirely through `vercel.json`), and **it has no Git connection** — which the
  Contentful rebuild webhook silently depends on, since Deploy Hooks are configured per branch under
  Git settings. **Rollback ends when the old env vars are deleted, not when the files are** — keep
  `SPACE_ID` / `ACCESS_TOKEN` / `SECRET_KEY` for two weeks after cutover.

## Not yet specified

In scope, but not yet sharp enough to ticket. Graduates as the frontier advances.

- **The build itself — and it is now ready to be sliced.** Every decision it depended on has landed:
  the stack is verified and spiked, the tokens are written and compiled, the copy is approved in both
  locales, the search contract is measured, the image transforms are sized, the URL scheme is fixed
  and the status indicator is specified. What remains is execution: scaffold, wire the Contentful
  content layer, port the four page types plus 404, build the search route, and the status script.
  **Charted — tickets 17–25**; 17, 18 and 19 are done. Dan confirmed the nav stays a
  React island at **118.6 KB gzip on every page**, chosen with the measured number in hand.
- **The long tail of pages.** 404, `sitemap.xml`, `robots.txt` (old versions sit in `old files/`),
  and the Open Graph / Twitter meta currently hardcoded in `base.html`.
- **Whether the i18n fallback is needed.** If the Paraglide SSG spike fails, Astro's own built-in
  i18n routing replaces it — a different set of build tickets, not yet worth charting.
- **Performance target.** Whether this effort commits to a measurable budget (Lighthouse, Core Web
  Vitals) or just "obviously faster than Flask". Worth deciding once the stack is real.

## Out of scope

Beyond the destination. These never graduate; they return only as a fresh effort.

- **`samnco-hk.com`.** Stays registered and dark. If it is ever wanted, it is a redirect to
  `samnco-hk.shop`, not a migration.
- **Cart, checkout, any e-commerce.** The dead cart markup in the current templates is dropped, not
  ported. The site keeps saying "contact us / visit us in store".
- **A contact form.** The footer continues to list phone, fax, WhatsApp and email as plain text.
- **Blog or news section.**
- **Analytics.**
- **Swapping Contentful for another CMS**, or moving products into the repo as content collections.
- **Full product-content translation.** Translating product titles and categories requires a zh-HK
  locale on Contentful and a Chinese value entered for every entry — content-entry work with no
  shortcut, which would dominate this effort and stall the migration behind it. Natural follow-up
  once the catalogue's zh-HK locale is populated.
- **A prebuilt static search index** (Pagefind / Fuse.js / MiniSearch). Superseded by the debounced
  API-route decision, which searches the whole catalogue regardless of size.
