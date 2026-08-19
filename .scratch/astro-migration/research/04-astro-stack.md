# Research: Astro + React + Tailwind + shadcn/Base UI on Vercel

Ticket: [04-research-astro-react-tailwind-shadcn-baseui.md](../issues/04-research-astro-react-tailwind-shadcn-baseui.md)
Researched: 2026-08-18. All versions are `latest` on npm as of that date.

**Verdict: the stack composes, and it composes better than the ticket assumed.** shadcn made Base UI
its *default* primitive library in July 2026, so Base UI is the happy path rather than a detour.
There is no hand-wrapping to do for any of the three interactive pieces.

**The one real problem is bundle cost, not composition.** Measured, not estimated: the React runtime
floor is **~60 KB gzip** on any page carrying an island, and the full set of islands this site wants
is **~138 KB gzip**. That is in direct tension with "the whole point of the migration is shipping
little JavaScript". See [§6](#6-island-hydration-cost-measured) — this needs a decision before the
build tickets are written.

---

## Verified versions

Everything below was resolved from the npm registry or from the published tarballs, not recalled.

| Package | Version | Note |
|---|---|---|
| `astro` | **7.2.3** | `engines: node >=22.12.0`. dist-tags: `latest 7.2.3`, `legacy 4.16.19` |
| `@astrojs/vercel` | **11.0.6** | `peerDependencies: { astro: "^7.0.0" }` — Astro 7 only |
| `@astrojs/react` | **6.0.3** | react peer `^17.0.2 \|\| ^18 \|\| ^19`. Declares **no** `astro` peer dep |
| `react` / `react-dom` | **19.2.8** | |
| `tailwindcss` | **4.3.3** | docs site banner reads v4.3 |
| `@tailwindcss/vite` | **4.3.3** | |
| `shadcn` (CLI **and** runtime dep) | **4.18.0** | |
| `@base-ui/react` | **1.7.0** | published 2026-08-04; 1.0.0 stable was 2025-12-11 |
| `embla-carousel-react` | **8.6.0** | |
| `@tanstack/react-query` | **5.101.4** | |
| `lucide-react` | **1.32.0** | |
| `@astrojs/tailwind` | 6.0.2 | **do not install** — legacy Tailwind 3 only, last publish 2025-03-26 |

### ⚠️ Base UI was renamed — this will bite anyone working from memory

`@base-ui-components/react` is **deprecated**. npm's own deprecation string:

> Package was renamed to @base-ui/react

The old name is frozen at `1.0.0-rc.0` (2025-12-04). Worse, `npm i @base-ui-components/react` now
**fails outright with `ETARGET`**, because its only `latest` is a prerelease that `*` won't match.
The correct package is **`@base-ui/react@1.7.0`**. (There is also an unrelated `base-ui` at 0.0.294 —
not it.)

`@base-ui/react` peers: `react`/`react-dom` `^17 || ^18 || ^19`. `date-fns`, `@date-fns/tz` and
`@types/react` are **optional** peers (date components only) — don't install them, ignore the warnings.
Runtime deps: `@babel/runtime`, `@base-ui/utils@0.3.2`, `@floating-ui/react-dom`, `@floating-ui/utils`,
`use-sync-external-store`.

---

## 1. Hybrid rendering on Vercel

**Answer: keep `output` at its default `'static'` and never set it to anything else. Add the adapter.
Put `export const prerender = false` on `/api/search` only.**

`output: 'hybrid'` was **removed in Astro 5** and still hard-errors in 7.2.3. From the shipped Zod
schema in `astro@7.2.3` (`dist/core/config/schemas/base.js`):

```js
.refine((val) => val !== "hybrid", {
  message: 'The `output: "hybrid"` option has been removed. Use `output: "static"` (the default) instead, which now behaves the same way.'
```

Valid values are only `'static'` and `'server'`
([configuration reference](https://docs.astro.build/en/reference/configuration-reference/#output)).
`'static'` is the default and means "prerender all your pages by default".

**Adding an adapter does not change the prerender default** — verified in `astro@7.2.3` source
(`dist/prerender/utils.js`), which consults `output` and nothing else:

```js
function getPrerenderDefault(config) {
  return config.output !== "server";
}
```

And `output: 'static'` **does** permit an on-demand endpoint. From `dist/core/routing/prerender.js`:

```js
if (!route.prerender) settings.buildOutput = "server";
```

The internal `buildOutput` flips to `server` as soon as any route opts out, which is what triggers the
SSR bundle and the Vercel Function. Without an adapter it throws `NoAdapterInstalled`. This is the
documented shape — [endpoints guide](https://docs.astro.build/en/guides/endpoints/#server-endpoints-api-routes):
*"In `static` mode, you must opt out of prerendering for each custom endpoint with `export const prerender = false`."*

### The config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // output: 'static' is the default. Do NOT set 'server'. 'hybrid' no longer exists.
  adapter: vercel(),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
```

> **Note the import path.** `@astrojs/vercel/serverless` and `@astrojs/vercel/static` were **removed
> in v10.0.0**. The 11.0.6 `exports` map has no such subpaths — the old import will fail to resolve.
> It is a single default export now.

**Gotcha:** the `prerender` export is detected by a **regex over source text**,
`^\s*export\s+const\s+prerender\s*=\s*(true|false);?`. It must be a literal `true`/`false` at the
start of a line. Dynamic values were removed in v5.

### What the adapter actually emits

Read from `dist/index.js` of `@astrojs/vercel@11.0.6`:

- Prerendered HTML → `.vercel/output/static/`
- **Exactly one** function → `.vercel/output/functions/_render.func/`, with `.vc-config.json`
  `{ "runtime": "nodejs24.x", "launcherType": "Nodejs", "supportsResponseStreaming": true }`
- `.vercel/output/config.json` (Build Output API v3) gets one `{ src: <regex>, dest: "_render" }`
  entry per **non-prerendered** route (`if (!route.isPrerendered)`), plus an immutable cache rule for
  `/_astro/(.*)`.

So: one Vercel Function for `/api/search`, everything else served as static files. `functionPerRoute`
was **removed in v8.0.0** — don't reach for it.

### Adapter options worth knowing

Complete option set in 11.0.6: `webAnalytics`, `includeFiles`, `excludeFiles`, `imageService`,
`imagesConfig`, `devImageService`, `middlewareMode`, `edgeMiddleware` (deprecated → use
`middlewareMode: 'edge'`), `maxDuration`, `isr`, `skewProtection`, `staticHeaders`.

- **`imageService: true`** — routes `astro:assets` through Vercel Image Optimization. Relevant to the
  still-open image-handling question in the map.
- **`maxDuration`** — seconds; sensible to cap the Contentful proxy (e.g. `15`).
- **`isr`** — ⚠️ **do not enable for `/api/search`.** Adapter docs: *"ISR function requests do not
  include search params, similar to requests in static mode"*, which would break a query-string search
  endpoint. If ever enabled site-wide: `isr: { exclude: [/^\/api\/.+/] }`.

### Vercel project mechanics

- **Delete the inherited Flask `vercel.json`** (the map already schedules this). The adapter writes
  `.vercel/output/config.json`, a different file. It actively errors on a `trailingSlash` conflict
  with a root `vercel.json`, and Vercel's own docs say: *"You should not use `vercel.json` to rewrite
  URL paths with astro projects; doing so produces inconsistent behavior, and is not officially
  supported."* Use Astro's `redirects` config instead — the adapter compiles those into `config.json`.
- **Node runtime** is derived from the Node version running the build (`process.version`), mapped
  `{18: deprecated, 20: available, 22: available, 24: default}`. Astro 7 needs ≥22.12.0, so you get
  `nodejs22.x` or `nodejs24.x`. **Set the Vercel project's Node.js Version to 24** to avoid drift.
- Framework preset **Astro**; leave build command and output dir at defaults.

### 🚨 Vercel's own Astro docs page is stale — do not follow it

<https://vercel.com/docs/frameworks/frontend/astro> (stamped `last_updated: 2026-06-15`) still shows
`import vercelServerless from '@astrojs/vercel/serverless'`, `output: 'hybrid'`, `functionPerRoute`
and `edgeMiddleware`. **All four are removed or deprecated.** Astro's docs and the actual package
exports are authoritative.

### The endpoint

`new Response(...)` is still the current and only documented way; no helper replaced it.
`astro:env` is the first-party type-safe way to declare the server-side Contentful token, and the
Vercel adapter declares `supportedAstroFeatures: { envGetSecret: "stable" }` with its entrypoint
calling `setGetEnv((key) => process.env[key])`.

```js
// astro.config.mjs — env schema
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      CONTENTFUL_SPACE_ID:      envField.string({ context: 'server', access: 'secret' }),
      CONTENTFUL_DELIVERY_TOKEN: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
```

```ts
// src/pages/api/search.ts
import type { APIRoute } from 'astro';
import { CONTENTFUL_DELIVERY_TOKEN } from 'astro:env/server';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  // fetch Contentful with CONTENTFUL_DELIVERY_TOKEN …
  return new Response(JSON.stringify({ items: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
```

By design it is impossible to set both `context: "client"` and `access: "secret"`, so the token cannot
leak into the client bundle. `astro:env` cannot be used inside `astro.config.mjs` itself or in client
`<script>` tags — use `process.env` there.

Also confirmed: export one function per HTTP method; *"If you define a `GET` function but no `HEAD`
function, Astro will automatically handle `HEAD` requests by calling the `GET` function and stripping
the body"*.

---

## 2. Tailwind v4 on Astro

**It is a Vite plugin, not an Astro integration.** `@astrojs/tailwind` is Tailwind-3-only legacy —
Astro's styling guide files it under a heading literally titled *"Legacy Tailwind 3 support"*.

Install: **`npx astro add tailwind`** (Astro ≥5.2.0). It writes the `vite.plugins` entry and scaffolds
`src/styles/global.css`. Equivalent manual route from
[Tailwind's Astro guide](https://tailwindcss.com/docs/installation/framework-guides/astro):

```
npm install tailwindcss @tailwindcss/vite
```

```css
/* src/styles/global.css */
@import "tailwindcss";
```

The stylesheet reaches pages by a plain frontmatter `import` in the shared layout — **there is no
auto-injection**:

```astro
---
import "../styles/global.css";
---
```

> **Cross-reference with ticket 03:** Paraglide is *also* wired as a Vite plugin. Both land in
> `vite.plugins` together, and that ticket's constraint that `build.concurrency` must stay at 1 still
> applies. Worth confirming plugin ordering when both are wired.

### Theme config: CSS-first `@theme`, no JS config

**Do not create a `tailwind.config.js`.** JS configs are backward-compat only and are **no longer
auto-detected** — they require an explicit `@config "../../tailwind.config.js";`, and `corePlugins`,
`safelist` and `separator` are unsupported in v4. Tailwind files `@config`/`@plugin` under a heading
"Compatibility": *"exist solely for compatibility with Tailwind CSS v3.x"*. shadcn agrees — its
`components.json` docs say *"For Tailwind CSS v4, leave this blank."*

Theme variable namespaces (from [/docs/theme](https://tailwindcss.com/docs/theme)) — the ones this
project needs: `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`,
`--breakpoint-*`, `--container-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`.

**The `@theme` vs `@theme inline` distinction is the thing to get right**, and it determines the shape
of ticket 06:

- Plain `@theme` — for **literal** values. Your coral/cream/charcoal hexes, font stacks, breakpoints.
- `@theme inline` — **required** whenever the value is a `var()` reference. Docs: *"Using the `inline`
  option, the utility class will use the theme variable **value** instead of referencing the actual
  theme variable"*, otherwise *"your utility classes might resolve to unexpected values because of how
  variables are resolved in CSS"*. This is exactly why shadcn's bridge block is `@theme inline`.
- **`:root` (not `@theme`) for a token that should NOT generate a utility class.** Docs are explicit:
  *"Use `@theme` when you want a design token to map directly to a utility class, and use `:root` for
  defining regular CSS variables that shouldn't have corresponding utility classes."*
- `@theme` variables must be **top-level** — not nested under a selector or media query. That is
  precisely why shadcn's light/dark values live in `:root`/`.dark` and are only *bridged* in.

Killing the stock Tailwind palette so only brand colors exist (useful given "stock shadcn styling
would read as a SaaS dashboard"):

```css
@theme {
  --color-*: initial;
  --color-coral: oklch(…);
  /* … */
}
```

Dark mode is now `@custom-variant`, not `darkMode: 'class'`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

**For this brochure site, dark mode is probably not in scope** — if so, delete the `.dark` block and
the `@custom-variant dark` line entirely.

---

## 3. shadcn with Base UI — the headline finding

### Base UI is now shadcn's DEFAULT, not a variant

[July 2026 changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default):

> "Starting today, Base UI is the default component library in shadcn/ui."
> "**New projects default to Base UI.** Run `npx shadcn init` and Base UI is the default pick."
> "The docs default to Base UI. Component pages open on the Base UI tab."
> "Radix is not being deprecated. … Prefer Radix for new projects? It's one flag away: `pnpm dlx shadcn init -b radix`"

So Dan's choice needs **no special handling at all** — it is what you get by doing nothing. The CLI
flag is `-b, --base <base>` taking `base | radix | aria` (React Aria was added as a third base, also
July 2026). Registries can pin a library via a `registry:base` config; *"Items without one now init as
Base UI."*

### Registry coverage is at full parity — measured, not assumed

Parsed from <https://ui.shadcn.com/r/index.json> (63 items):

- **56 items ship both `base` and `radix`** implementations
- **1 item is Base-UI-only** (`toast`)
- **0 items are Radix-only**

Choosing Base UI costs nothing in component coverage. There is nothing to hand-wrap.

### The three interactive pieces — verified at source level

Sources read directly from `github.com/shadcn-ui/ui/…/apps/v4/registry/bases/base/ui/*.tsx`, and
cross-checked against what `npx shadcn@4.18.0 view combobox` actually serves.

| Piece | Registry item | Actually imports | Verdict |
|---|---|---|---|
| Mobile nav (dialog) | `sheet` | `Dialog as SheetPrimitive` from `@base-ui/react/dialog` | ✅ real Base UI |
| Mobile nav (drawer) | `drawer` | `Drawer as DrawerPrimitive` from `@base-ui/react/drawer` | ✅ real Base UI, **no `vaul`** |
| Mobile nav (disclosure) | `collapsible` / `accordion` | `@base-ui/react/collapsible`, `/accordion` | ✅ real Base UI |
| Desktop nav | `navigation-menu` | `@base-ui/react/navigation-menu` | ✅ real Base UI |
| Search combobox | `combobox` | `Combobox as ComboboxPrimitive` from `@base-ui/react` | ✅ real Base UI, **not cmdk** |
| Image gallery | `carousel` | `useEmblaCarousel` from `embla-carousel-react` | ⚠️ **Embla in every base** |

**The carousel answer, definitively.** Base UI has **no carousel primitive** — confirmed two
independent ways: (a) the published `@base-ui/react@1.7.0` `exports` map contains no `carousel` entry,
and (b) base-ui.com has no carousel page. But this is a **non-issue**: shadcn's `carousel` registry
item lists its `api` meta link as `embla-carousel` for **all three bases** (`base`, `radix`, `aria`)
identically. The Embla wrapper is the intended path regardless of primitive library. Nothing is lost
by choosing Base UI, and there is nothing to hand-wrap.

Parts exported: `Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext` —
which maps cleanly onto the current Bootstrap carousel in `templates/detail.html`
(a plain slide list with prev/next controls, no thumbnails).

**Combobox note:** shadcn's `combobox` pulls `registryDependencies: ["button", "input-group"]` and
`dependencies: ["@base-ui/react"]`. Do **not** confuse it with the `command` item, which still uses
`cmdk` — you don't need cmdk.

### Base UI's full public API surface (from the published `exports` map, 1.7.0)

44 public subpaths:

```
accordion, alert-dialog, autocomplete, avatar, button, checkbox, checkbox-group,
collapsible, combobox, context-menu, csp-provider, dialog, direction-provider, drawer,
field, fieldset, form, input, menu, menubar, merge-props, meter, navigation-menu,
number-field, otp-field, popover, preview-card, progress, radio, radio-group,
scroll-area, select, separator, slider, switch, tabs, toast, toggle, toggle-group,
toolbar, tooltip, types, unstable-use-media-query, use-render
```

(plus 37 `internals/*` paths — don't import those.)
**No `carousel`. Both `combobox` AND `autocomplete` exist as separate primitives.**

### Combobox handles remote search natively — this is a big win for ticket 09

From <https://base-ui.com/react/components/combobox>, the async story is first-class:

- **`filter={null}`** disables built-in client-side filtering
- **`filteredItems`** — *"When provided, the list will use these items instead of filtering the `items`
  prop internally"*
- **`onInputValueChange`** to trigger the fetch; `onValueChange` for selection
- The docs ship an **"Async search (single)"** example using `useTransition` + `AbortController`,
  keeping the selected item visible while results stream in, with `Combobox.Status` for status messaging

Parts: `Combobox.Root / Input / Trigger / Popup / List / Item / Status / Empty / Portal`.

That is precisely the debounced-remote-search shape the charting decision specified. **No hand-wrapping.**

---

## 4. shadcn CLI in an Astro project

The [Astro guide](https://ui.shadcn.com/docs/installation/astro) still exists and is maintained.

**Order matters: Tailwind and `@astrojs/react` must both be configured *before* `shadcn init`.** The
docs say *"If you're adding shadcn/ui to an older or custom Astro app, make sure both are configured
before continuing."*

**tsconfig — additive, no conflict.** I unpacked `astro@7.2.3` and read
`tsconfigs/{base,strict,strictest}.json`: **none of them set `baseUrl` or `paths`.** So this is purely
additive alongside `"extends": "astro/tsconfigs/strict"`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Astro resolves `@/*` from tsconfig paths at build time, so — unlike shadcn's Vite guide — you do **not**
need a `vite.resolve.alias` block.

Two genuine friction points (neither is a tsconfig conflict):

- Astro's base config sets **`verbatimModuleSyntax: true`**, so type-only imports must use `import type`.
- **Use `astro/tsconfigs/strict`, not `strictest`.** `strictest` adds `noUnusedLocals`,
  `noUnusedParameters` and `exactOptionalPropertyTypes`, which shadcn's generated components are not
  guaranteed to satisfy.

Set **`rsc: false`** in `components.json` (Astro has no RSC; this controls whether `"use client"` is
emitted). Note the docs page does not actually print the Astro `components.json`, so this is inference
from Astro having no RSC — sound, but not a quoted claim.

`init` flags (from `shadcn@4.18.0 --help`): `-t/--template (next, vite, start, react-router, laravel, astro)`,
`-b/--base (base, radix, aria)`, `-p/--preset`, `-y/--yes`, `-d/--defaults`, `-f/--force`, `-c/--cwd`,
`--css-variables` / `--no-css-variables`, `--rtl`, `--monorepo`, `--pointer`, `--reinstall`.

`components.json` required fields (from the live JSON Schema at <https://ui.shadcn.com/schema.json>):
`style`, `tailwind` (`config`, `css`, `baseColor`, `cssVariables`), `rsc`, `aliases` (`utils`, `components`).
`baseColor` options are now `neutral | stone | zinc | mauve | olive | mist | taupe` — the old
`slate/gray/red/rose/…` are gone. It only seeds initial token numbers, so pick `neutral` and overwrite.

---

## 5. Theming shadcn away from stock (input to ticket 06)

Source: <https://ui.shadcn.com/docs/theming>. **Color space is `oklch` throughout — HSL is gone.**

Two things that differ from older recollection:

1. **The scaffold now begins `@import "shadcn/tailwind.css";`** — a real npm import.
   `shadcn@4.18.0` declares `"./tailwind.css": "./dist/tailwind.css"` in its `exports`, providing
   `@custom-variant data-open / data-closed / data-checked / data-selected / data-disabled / …` plus
   keyframes. **This means `shadcn` must be a project *dependency*, not just an `npx` tool.**
2. **`tw-animate-css` no longer appears anywhere in shadcn's docs** — its role was absorbed by
   `shadcn/tailwind.css`. Don't add it.

The mechanism, and the rule for ticket 06:

- Raw token values live in **`:root` / `.dark`** as plain CSS vars (no utilities generated).
- **`@theme inline`** bridges them into Tailwind's `--color-*` namespace — that is what makes
  `bg-background`, `text-foreground`, `border-border`, `ring-ring` exist. `inline` is *mandatory* here
  because the values are `var()` references that `.dark` reassigns.
- Semantic convention: *"the base token controls the surface color and the `-foreground` token controls
  the text and icon color that sits on that surface."*
- `--radius` is a single base token; `--radius-sm/md/lg/xl/…` are `calc()`-derived from it, so changing
  one value rescales the whole system.

Concrete guidance:

1. Keep `cssVariables: true`. **Overwrite the numbers in `:root` only; leave the `@theme inline` bridge
   block intact.**
2. Convert the brand palette to oklch and assign: cream `#f7e1d3` → `--background`, warm charcoal
   `#473D3C` → `--foreground`, coral `#e07d78` → `--primary`. Keep the *whole* token set defined even
   if it looks unused — components reference `--popover`, `--muted`, `--ring` unconditionally.
3. Brand extras that aren't shadcn semantics go in a **separate plain `@theme`** block (literal values,
   no `inline`).
4. Fonts: `@theme { --font-display: "…", serif; }`. *But* if the family name comes from another
   variable (e.g. an Astro font-provider var), that declaration must move into `@theme inline`.
5. `--chart-*` and `--sidebar-*` are dead weight for a catalogue site — delete both the `:root` entries
   and their `@theme inline` lines.
6. If shipping light-only, delete `.dark { … }` and the `@custom-variant dark` line.

---

## 6. Island hydration cost (measured)

**These are real measured numbers**, not estimates: a scratch Astro 7.2.3 project was built with each
island on its own page, and each page's transitive static-import closure was walked from the built HTML
and gzipped. There are **zero dynamic imports** in the output, so the closure is exactly the initial load.

| Page | Island | Raw KB | **Gzip KB** | Δ gzip vs React floor |
|---|---|---:|---:|---:|
| A | none | 0 | **0.00** | — |
| B | `useState` button | 188.32 | **59.88** | *(floor)* |
| C | Base UI `dialog` | 257.83 | **84.98** | +25.10 |
| D | Base UI `combobox` | 312.03 | **105.31** | +45.43 |
| E | `combobox` + react-query | 344.76 | **114.90** | +55.02 |
| F | `embla-carousel-react` | 207.13 | **67.20** | +7.32 |
| G | Base UI `navigation-menu` | 291.68 | **97.28** | +37.40 |

- **A page with no islands ships literally zero JS.** Confirmed — no script tags at all.
- **React floor = 59.67 KB gzip**, shared by every island page. Almost all of it is one chunk
  (`react-dom/client` + `scheduler` + Astro's `hydrateRoot` glue, 56.4 KB gzip alone).
- Astro's inline `astro-island` runtime adds **1.83 KB gzip** to any page carrying an island.
- **react-query alone = +9.59 KB gzip.**
- **⚠️ The deltas are NOT additive.** Base UI's internals are shared chunks reused across dialog /
  combobox / navigation-menu. The **union of every chunk** — what someone browsing the whole site
  downloads — is **138.46 KB gzip across 15 chunks**, not floor + 25 + 45 + 37.

Versions measured: astro 7.2.3, @astrojs/react 6.0.3, react/react-dom 19.2.8, @base-ui/react 1.7.0,
@tanstack/react-query 5.101.4, embla-carousel-react 8.6.0, vite 8.2.1.
Probe project left at `scratchpad/bundle-probe` (re-runnable: `node measure.mjs`).

### Recommended `client:*` directive per island

Semantics confirmed from the [directives reference](https://docs.astro.build/en/reference/directives-reference/).
All of these server-render to HTML first except `client:only`.

| Island | Directive | Why |
|---|---|---|
| Mobile nav | `client:media="(max-width: 767px)"` | Docs cite this exact case: *"Sidebar toggles, or other elements that might only be visible on certain screen sizes."* Desktop visitors never download it. |
| Search combobox | `client:idle` | In the header, but not needed on first paint. `requestIdleCallback`; accepts a `timeout` option. |
| Product gallery | `client:visible` | Options include `rootMargin` to start hydrating just before it scrolls in. Use `client:load` only if it is genuinely above the fold and interaction-on-arrival matters. |

**Choosing a lazier directive defers the download but does not reduce the byte count.** Only removing
an island does that.

---

## 7. Open risks — decide these before the build tickets

**1. 🔴 The JS budget is the real finding, and it contradicts the migration's stated purpose.**
The map says "the site reads as dated and is painful to maintain" and the ticket says "the whole point
of the migration is shipping little JavaScript". A ~60 KB gzip React floor plus ~138 KB across the site
is not "little JavaScript" for a five-page brochure site. Worth noting the current Flask site's mobile
nav is ~30 lines of vanilla JS. Options, roughly in order of payoff:

   - **Make the mobile nav zero-JS.** A `<details>`/CSS-only disclosure, or the existing vanilla
     toggle, ships 0 KB instead of 60–97 KB gzip. This alone keeps React off the home, about and 404 pages.
   - **Make the gallery zero-JS.** CSS `scroll-snap` with anchor links is a well-trodden pattern and
     ships 0 KB versus 67 KB gzip. Embla's own cost is only 7 KB — it's the React floor underneath that hurts.
   - **If both of the above land, React loads only on the store/search page**, where it is genuinely
     earning its keep. That is a dramatically better outcome than islands on every page.
   - **Reconsider react-query** (+9.59 KB gzip) for caching a single endpoint. Charting explicitly chose
     it for per-query caching/dedupe/previous-results; a small `Map`-backed hook would do the same for
     ~0 KB. **Flagging, not overruling — this was a deliberate decision.**
   - **Preact/compat** would cut the floor substantially, but Base UI and shadcn target React 19 and
     this is untested here. High risk; mention only if the budget matters more than the component library.

   This tension should go back to Dan rather than being resolved silently in a build ticket.

**2. 🟡 Astro 7's `compressHTML` default changed from `true` to `'jsx'`.** Whitespace between inline
elements is now stripped JSX-style — the upgrade docs' own example renders `helloworld` instead of
`hello world`. Porting Jinja templates verbatim can silently lose spaces. Fix with `{" "}` or set
`compressHTML: true`.

**3. 🟡 Astro 7 replaced the Markdown processor** (new default "Sätteri"; `@astrojs/markdown-remark` no
longer installed by default). Only bites if the migration uses Markdown content — currently it does not.

**4. 🟡 `astro:env` secret validation.** `env.validateSecrets: true` validates at build rather than
runtime, but docs warn *"all secrets are validated whenever anything is imported from the
`astro:env/server` module"* — CI builds may need dummy values. Default is `false`.

**5. 🟢 Base UI 1.7.0 is 8 months past 1.0** with minor releases roughly monthly (1.1 through 1.7,
Jan–Aug 2026). Actively maintained, but pin the version — I did not audit the 1.0→1.7 release notes for
breaking changes to Combobox or NavigationMenu specifically.

---

## Explicitly uncertain / could not verify

Recorded honestly rather than guessed:

- **What `shadcn init` actually writes into `components.json` for Astro.** I attempted a real
  non-interactive `shadcn@4.18.0 init -t astro` in a scratch project; **it exceeded a 7-minute timeout
  and produced no output.** The field *shapes* above come from the live JSON Schema and docs, but the
  concrete generated file is unverified. **Recommendation: run `npx shadcn@latest init` in a scratch
  dir first and read the generated `components.json` rather than hand-authoring it.**
- **`components.json` `style` docs are internally inconsistent.** `/docs/components-json` still says
  `"new-york"` and calls `default` deprecated, while `/docs/theming` shows `"base-nova"` and the schema
  lists 26 values (`radix-*`/`base-*`/`aria-*` × `vega, nova, maia, lyra, mira, luma, sera, rhea`).
  I found no primary page describing what those preset names visually mean — **don't assume**.
- **`iconLibrary`, `menuColor`, `menuAccent`, `rtl`** exist in the JSON Schema but have **no prose
  documentation**. `lucide-react` is almost certainly the icon default (the CLI-served combobox imports
  it, and `shadcn migrate icons` exists) — but that is inference.
- **`import.meta.env.SECRET` at Vercel runtime** — docs are ambiguous about whether a dashboard-only var
  resolves through `import.meta.env` inside a function. Not tested. Use `astro:env/server` or
  `process.env`, both explicitly supported.
- **Precedence of a root `vercel.json` over the adapter's `.vercel/output/config.json`** is not
  documented by Vercel for `routes`/`headers`/`redirects`. Moot if the Flask `vercel.json` is deleted
  as planned.
- **`@astrojs/react` declares no `astro` peer dependency.** Astro 7 compatibility is inferred from its
  `devDependencies.astro: 7.2.3` and the shared Vite 8 release train. No published compatibility matrix.
- **No Base-UI-specific Astro hydration issue was found** in a search of the Astro issue tracker. That
  is absence of evidence, not evidence of absence — generic island rules (props must be serializable,
  no HTML-rendering props) still apply.
- **Base UI's docs do not state SSR support explicitly** on the pages checked. The bundle probe
  server-rendered Base UI dialog/combobox/navigation-menu islands without error, so it works in
  practice, but there is no quotable guarantee.
