# Spike result: Paraglide SSG on Astro 7

Ticket: `../issues/11-spike-paraglide-ssg-on-astro.md`
Date: 2026-08-19
Method: a throwaway Astro project built from scratch, not a documentation read.
Scratch project (not merged): `<scratchpad>/paraglide-spike`

## Versions actually installed and built

`astro` 7.2.3 · `@astrojs/react` 6.0.3 · `@astrojs/vercel` 11.0.6 · `@inlang/paraglide-js` 2.24.1 ·
`react` / `react-dom` 19.2.8 · `tailwindcss` + `@tailwindcss/vite` 4.3.3 · `shadcn` (registry
`base-nova`) · `@base-ui/react` · `embla-carousel-react` — exactly the versions ticket 04 verified.

## Verdict: GREEN — the setup works, with one silent failure mode found

| Check | Result |
| --- | --- |
| Both locales prerender as separate static routes | ✅ `/index.html` + `/zh-hk/index.html` |
| English unprefixed, Chinese prefixed | ✅ `lang="en"` / `lang="zh-hk"`, switcher `/` ⇄ `/zh-hk/` |
| React island renders correct locale, no threading | ✅ build-time and client-side agree |
| **No hydration mismatch** | ✅ headless Chromium, zero console warnings, island interactive |
| `getStaticPaths()` under the locale tree | ✅ 60 ids × 2 locales |
| On-demand `/api/` route beside prerendered pages | ✅ emitted as a function, `^/api/search/?$` → `_render` |
| Middleware `/api/` exclusion | ✅ endpoint returns JSON, untouched by locale middleware |
| `shadcn init` on Astro with Base UI | ✅ after two prerequisites — see below |
| Raised `build.concurrency` | ❌ **corrupts locales silently — see below** |

## The important finding: `build.concurrency` corrupts locales, silently

The research warned about this from reading the source. **It reproduces, and it fails silently.**

- 60 pages per locale, `build.concurrency: 8`, no artificial delay → **all 122 correct**. Pages
  rendered in ~80 ms total, too fast to interleave. This is a false negative.
- Same build with a small `await` in page frontmatter to force genuine overlap → **13 of 122 pages
  got the wrong locale.** English pages rendered `三和文藝公司` with `lang="zh-hk"`, and Chinese pages
  rendered `Sam and Company`.
- Same delays at `concurrency: 1` (the default) → **all 122 correct.**

**The build exits 0 either way.** There is no warning, no error — just wrong content on a fraction of
pages, and *which* pages varies per run.

This matters more for the real site than for the spike: 348 products × 2 locales, each page awaiting
a Contentful fetch, is precisely the interleaving condition that triggers it. The delay-free test
passing is exactly the trap — a quick check would have "proved" concurrency is safe.

**Mitigation**: Astro's default is already 1, so the site is safe as built. The risk is a future
someone raising it to speed up a ~700-page build. `spike-check-locales.mjs` in this directory is the
regression test; wire it into the build pipeline so this can never regress unnoticed.

## Corrections to the recommended setup from ticket 03

1. **`emitTsDeclarations: true` requires `typescript` as an installed dependency.** Without it the
   build fails outright: *"Paraglide's emitTsDeclarations option requires the typescript package."*
   Ticket 03's config block omits this. Install `typescript`, or drop the option.
2. **The simple locale spelling works.** `zh-hk` used consistently in `project.inlang`, Astro's
   `i18n.locales` and the folder name produced correct output and `lang="zh-hk"`. The canonical-case
   `zh-HK` variant was **not** tested — take the simple spelling unless ticket 07 decides
   `lang="zh-HK"` matters.

## `shadcn init` on Astro — resolved, and it was never a timeout

Ticket 04 reported `shadcn init -t astro` "timed out at 7 minutes". It was **blocked on an
interactive prompt**, not slow. Two prerequisites, both undocumented in the failure message:

1. **`-y` does not skip the preset picker.** Pass `-p <preset>` explicitly. Valid presets: `nova`,
   `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`. Note `--defaults` advertises
   `--preset=base-nova`, but `base-nova` is **rejected** as a preset name — it is the resulting
   `style` value in `components.json`, not an input. Use `-p nova`.
2. **Path aliases must exist in `tsconfig.json` first.** Astro's default `strict` tsconfig has none,
   and init fails with *"Could not find valid path aliases"*. Add before running:
   ```json
   "baseUrl": ".", "paths": { "@/*": ["./src/*"] }
   ```

Working invocation:
```
npx shadcn@latest init -t astro -b base -p nova -y --no-monorepo
```

`-b` is the **primitive base** flag with enum `base | radix | aria` — independent confirmation that
Base UI is first-class. `npx shadcn@latest add combobox carousel dialog` then installed
**`@base-ui/react`, `embla-carousel-react`, `lucide-react`, `class-variance-authority`, `clsx` —
and zero Radix packages**, confirming ticket 04's registry-parity finding empirically.

## Measured JavaScript cost (feeds ticket 12)

A page carrying one React island with a shadcn/Base UI `Button` + `Dialog` and Paraglide messages:

| Chunk | gzip |
| --- | --- |
| `client.*.js` (React runtime) | 55.1 KB |
| `Island.*.js` (island + Base UI dialog + messages) | 31.4 KB |
| `react-dom.*.js` | 4.0 KB |
| **Total** | **90.6 KB gzip** |

**A page with no island ships zero JavaScript — not a single `<script src>`.** This is the concrete
version of ticket 12's trade-off: the cost is per-page-with-an-island, and Astro genuinely delivers
nothing on the pages that don't need it.

## Artifacts kept

- `spike-check-locales.mjs` — asserts every prerendered page has the right locale. **Keep as a
  regression test.**
- `spike-hydrate-test.mjs` — Playwright check for hydration mismatch and island interactivity.
