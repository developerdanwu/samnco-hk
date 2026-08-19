# Spike the Paraglide SSG setup on the real Astro version

Type: task
Status: resolved
Blocked by: —

## Question

The Paraglide research established the correct SSG wiring but also found that **this exact path has
no example project and no test**. PR #704 validated it only in a throwaway Astro 5.17.1 + Paraglide
2.11.0 fixture, documentation-only. We would be running Astro 7 + Paraglide 2.24.1.

i18n is load-bearing across every page of this site. Discovering the setup does not work after the
pages are built would be expensive, so prove it in a throwaway project first.

Prove, in a scratch Astro project on the versions the stack research settled on:

- A page prerenders in **both locales** as separate static routes, English unprefixed and Chinese
  under `/zh-hk/`, with `output: "static"`.
- A **React island** renders a translated string correctly with no locale threading and **no
  hydration mismatch warning** in the console — the mechanism the research traced through the
  runtime source, confirmed empirically rather than by reading.
- The locale **switcher** works, and a direct hit on a `/zh-hk/` URL resolves correctly on a cold
  load.
- A route that is **not** prerendered (a stub `/api/` endpoint, standing in for search) coexists
  with the prerendered pages, and is excluded from the locale middleware without breaking either.
- `build.concurrency` at its default of 1 — and, out of curiosity, confirm that raising it does
  corrupt locale resolution, so the constraint is understood rather than cargo-culted.

While the scratch project exists, also settle the one thing the stack research could not: **run
`shadcn init -t astro`** (it timed out at 7 minutes during research, so the generated
`components.json` is unconfirmed) and record what it actually produces, rather than hand-authoring
the config later and debugging the difference.

If any of this fails, the fallback is Astro's own built-in i18n routing; record what failed and how
far it got, because that determines whether the fallback is a small swap or a redesign.

Resolved when the spike is green, or when it has failed clearly enough to choose the fallback.
The scratch project is throwaway — nothing from it is merged.

## Answer

**GREEN — the Paraglide SSG setup works on Astro 7.2.3 + Paraglide 2.24.1.** Every check in the
question passed. Full result: [`../research/11-paraglide-spike-result.md`](../research/11-paraglide-spike-result.md).

Both locales prerender as separate static routes (English unprefixed, `/zh-hk/` prefixed);
`getStaticPaths()` works under the locale tree; the React island renders the correct locale with no
threading and **no hydration mismatch** (verified in headless Chromium, not by reading); the
on-demand `/api/` route coexists with prerendered pages and the middleware exclusion works.

### The finding that justified the spike

**Raising `build.concurrency` corrupts locales, silently.** Reproduced: with 60 pages per locale and
a small `await` in frontmatter to force overlap, `concurrency: 8` gave **13 of 122 pages the wrong
locale** — English pages rendering `三和文藝公司` with `lang="zh-hk"`. At the default `concurrency: 1`,
all 122 were correct. **The build exits 0 either way**, with no warning.

Two things make this worse than it sounds. Without the artificial delay the same test **passed at
concurrency 8** — pages rendered too fast to interleave — so a casual check would wrongly conclude
it is safe. And the real site is exactly the triggering condition: ~700 pages each awaiting a
Contentful fetch.

Astro's default is already 1, so the site is safe as built. The risk is a future optimisation.
**`../research/spike-check-locales.mjs` is the regression test — wire it into the build.**

### Corrections to ticket 03's recommended setup

- **`emitTsDeclarations: true` requires `typescript` installed** or the build fails outright. Ticket
  03's config block omits this.
- The simple locale spelling (`zh-hk` everywhere) works and was what got tested. The canonical-case
  `zh-HK` variant is **untested** — see ticket 07 if `lang="zh-HK"` matters.

### `shadcn init` — resolved, and it was never a timeout

Ticket 04's "timed out at 7 minutes" was a **blocking interactive prompt**. Working invocation:

```
npx shadcn@latest init -t astro -b base -p nova -y --no-monorepo
```

Two undocumented prerequisites: `-y` does **not** skip the preset picker (pass `-p nova`; note
`base-nova` is the resulting `style` value, not a valid preset input), and **path aliases must
already exist in `tsconfig.json`** (`"baseUrl": "."`, `"paths": {"@/*": ["./src/*"]}`) or init fails.

`shadcn add combobox carousel dialog` then installed `@base-ui/react`, `embla-carousel-react`,
`lucide-react`, `class-variance-authority`, `clsx` — and **zero Radix packages**, confirming ticket
04's parity finding empirically. `-b` takes `base | radix | aria`.

### Measured JS cost, for ticket 12

**90.6 KB gzip** for a page with one React island carrying a shadcn/Base UI Button + Dialog
(React runtime 55.1 + island 31.4 + react-dom 4.0). **A page with no island ships zero JavaScript —
not a single `<script src>`.**
