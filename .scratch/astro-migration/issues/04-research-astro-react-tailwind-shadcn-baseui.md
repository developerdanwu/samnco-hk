# Research the Astro + React + Tailwind + shadcn/Base UI stack on Vercel

Type: research
Status: resolved
Blocked by: —

## Question

Confirm the chosen stack composes, and surface the setup decisions the build will otherwise trip
over. Verify against primary sources — Astro docs, Tailwind docs, shadcn docs, Base UI docs, the
Vercel adapter README.

- **Hybrid rendering on Vercel.** Every page prerenders statically, but one route (`/api/search`)
  must run as a serverless function. Establish exactly how `@astrojs/vercel` and Astro's current
  output/prerender configuration express that combination.
- **Tailwind on Astro at its current major version.** How it is installed today (a Vite plugin
  rather than an Astro integration, as of Tailwind v4) and how the theme is configured — CSS-first
  `@theme` tokens versus a JS config. This determines the shape of the design-tokens ticket.
- **shadcn/ui with Base UI instead of Radix.** Dan explicitly chose Base UI. Establish whether
  shadcn's registry ships Base UI variants of the components needed here, or whether Base UI
  primitives must be wrapped by hand. Do **not** assume Radix-equivalence.
- **Component availability for the three interactive pieces.** Mobile nav (a disclosure or dialog),
  product image gallery (headless libraries generally do *not* ship a carousel — shadcn's wraps
  Embla; confirm what the Base UI path is), and the search input with a results popover
  (Combobox/Autocomplete). Name what exists, what needs wrapping, and what needs a third-party
  library.
- **shadcn's CLI in an Astro project.** Whether it initialises cleanly, what path aliases and
  `components.json` settings it expects, and whether it fights Astro's default `tsconfig`.
- **Island hydration cost.** Roughly what the React runtime plus these components adds to the
  bundle, and which `client:*` directive each island should use — the whole point of the migration
  is shipping little JavaScript, so this number should be known rather than discovered at the end.

Capture findings as a Markdown file in the repo and link it from the answer.

## Answer

**The stack composes, and more cleanly than this ticket assumed. One measured finding needs a
decision from Dan — see ticket 12.**

Findings: [`../research/04-astro-stack.md`](../research/04-astro-stack.md).
Verified versions: `astro` 7.2.3, `@astrojs/vercel` 11.0.6, `@astrojs/react` 6.0.3, `react` 19.2.8,
`tailwindcss` / `@tailwindcss/vite` 4.3.3, `shadcn` 4.18.0, `@base-ui/react` 1.7.0.

- **Base UI is not a detour — it is shadcn's default.** As of July 2026 shadcn made Base UI the
  default primitive library; `-b radix` is now the *opt-out*. Registry parity is complete: of 63
  items, 56 ship both, 1 is Base-UI-only, **zero are Radix-only**. Nothing needs hand-wrapping. The
  charting concern that Base UI would cost us components was wrong.
- **All three interactive pieces are covered**, confirmed at source level. Mobile nav →
  `sheet`/`drawer` on real `@base-ui/react/dialog` and `/drawer`, no `vaul`. Search → `combobox` on
  real Base UI, not `cmdk`, with **first-class async support** (`filter={null}` + `filteredItems`,
  and a documented AbortController example) that matches the debounced-remote-search design in
  ticket 09 almost exactly.
- **Base UI has no carousel primitive — and it does not matter.** shadcn's carousel is Embla for all
  three bases identically, so the gallery is an Embla decision independent of the primitive choice.
- **A package rename that would have broken the build.** `@base-ui-components/react` is deprecated
  and now **fails to install outright with `ETARGET`**. The correct package is `@base-ui/react`.
- **`output: 'hybrid'` was removed and hard-errors.** The prerender-everything-plus-one-function
  shape is the default `output: 'static'` + the Vercel adapter + `export const prerender = false` on
  the single API route. The `@astrojs/vercel/serverless` subpath is also gone.
- **Vercel's own Astro documentation page is stale and wrong on all four counts above.** Do not
  follow it; follow the Astro and adapter docs.

### Constraints and follow-ups

- **The JavaScript cost is real and measured, not estimated: ~60 KB gzip React floor on any page
  carrying an island, ~138 KB gzip for the full island set** (deltas are not additive — Base UI
  shares chunks). This is in tension with the migration's "ship little JavaScript" rationale. It is
  Dan's decision, not a build-ticket detail — raised as ticket 12 rather than resolved here.
- **`shadcn init -t astro` is unverified** — it timed out at 7 minutes, so the generated
  `components.json` is unconfirmed. Run it in a scratch directory rather than hand-authoring the
  config; folded into the spike in ticket 11.
