# Research: Paraglide JS on Astro

Ticket: `../issues/03-research-paraglide-on-astro.md`
Date: 2026-08-18
Method: primary sources only — the `@inlang/paraglide-js` npm tarball and its compiled runtime source,
the `opral/paraglide-js` repo (docs, official Astro example, issues/PRs), `paraglidejs.com`, and
`docs.astro.build` / the `withastro/docs` markdown source. No blog posts were used.

---

## Versions verified against

| Package | Version | Published | How verified |
| --- | --- | --- | --- |
| `@inlang/paraglide-js` | **2.24.1** | 2026-08-15 | npm registry `dist-tags.latest`; tarball downloaded and read |
| `@inlang/paraglide-astro` | 0.4.1 | 2025-03-13 | npm registry — **deprecated**, see below |
| `astro` | **7.2.3** | 2026-08-18 | npm registry `dist-tags.latest` (7.0.0 released 2026-06-22) |
| `@astrojs/react` | 6.0.3 | 2026-08-18 | npm; peer allows React 17/18/19 |
| `@astrojs/vercel` | 11.0.6 | 2026-08-18 | npm; peer `astro: ^7.0.0` |
| Paraglide docs read | `opral/paraglide-js@main` | HEAD of 2026-08-15 | raw.githubusercontent |

Paraglide is actively maintained — 160 published versions, last release three days before this research.

---

## Verdict

**Paraglide composes with this stack, and the setup is documented — but the specific
combination we need (Astro *static* output) is the thinner of Paraglide's two Astro paths.**

- There is **no maintained Astro integration package**. `@inlang/paraglide-astro` is formally
  deprecated on npm. Paraglide 2.x is the framework-agnostic compiler wired in by hand as a **Vite
  plugin** inside `astro.config.mjs`. This is the intended, current design — not neglect.
- Paraglide's official Astro *example* (in-repo, CI-adjacent) is the **SSR** setup: `output: "server"`
  + `paraglideMiddleware()`. That is **not** our setup and must not be copied.
- Paraglide's **SSG** path for Astro is documented in `docs/static-site-generation.md` under a
  dedicated "Astro (Middleware)" heading, added June 2026 (PR #704, closing issue #616). It uses
  `output: "static"`, Astro's `i18n` config, and a middleware that calls `setLocale()`. **There is no
  example project or test for it** — see Risks.
- Message functions in React islands work by construction; I traced the mechanism through the
  compiled runtime source rather than trusting the docs. See "How the locale reaches islands".

---

## What was verified, with sources

### 1. The Astro adapter is dead; the Vite plugin is the way

npm metadata for `@inlang/paraglide-astro@0.4.1` carries a `deprecated` field, verbatim:

> "use the paraglide-js package directly with v2 or above
> https://www.npmjs.com/package/@inlang/paraglide-js. the astro adapter is not needed anymore"

Its README repeats this. The old adapter delegated to `@inlang/paraglide-vite@1.4.0` (also frozen at
2025-02-28) and peer-depended on `astro: ^4 || ^5` — it would not install cleanly against Astro 7.

`@inlang/paraglide-js@2.24.1` `package.json` declares `vite` as an **optional peer dependency**
(`>=5.0.0`) and lists `astro`/`astro i18n` in its keywords. Its devDependencies pin `vite@8.1.4`,
i.e. the compiler is developed against the same Vite major Astro 7 ships
("Astro v7.0 upgrades to Vite 8 as the development server and production bundler" — Astro v7 upgrade
guide).

Note: `npx @inlang/paraglide-js init` will **not** wire up an Astro project automatically.
`dist/cli/steps/detect-bundler.js` only looks for `./vite.config.js` / `./vite.config.ts`; an Astro
project has `astro.config.mjs`, so the plugin must be added by hand.

### 2. Two Astro setups exist, and only one is ours

**SSR (the in-repo example, `examples/astro/`)** — `astro@^5.16.8`, `@astrojs/node`, a Svelte island:

```js
// examples/astro/astro.config.mjs (verbatim, trimmed)
vite: { plugins: [ paraglideVitePlugin({ project: "./project.inlang", outdir: "./src/paraglide",
  emitTsDeclarations: true, strategy: ["url"] }) ] },
output: "server",
adapter: node({ mode: "standalone" }),
```

Its README carries this note verbatim:

> This example uses Astro's server output and Paraglide's server middleware.
> If you use Astro SSG with `getStaticPaths()`, use `output: "static"` and set
> the locale during prerendering instead of using `paraglideMiddleware()`.

**SSG (docs only)** — `docs/static-site-generation.md`, section "Setting the Locale → Astro
(Middleware)", verbatim:

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { assertIsLocale, baseLocale, setLocale } from "./paraglide/runtime.js";

export const onRequest = defineMiddleware((context, next) => {
  setLocale(assertIsLocale(context.currentLocale ?? baseLocale));
  return next();
});
```

> This runs during server-side static rendering, so `setLocale()` does not navigate a browser. […]
> Do not use `paraglideMiddleware()` for Astro SSG. The server middleware de-localizes request URLs
> for SSR, while static pages need Astro to render each localized path directly.

…paired with `output: "static"`, Astro `i18n` configured with the same locales as `project.inlang`,
and `strategy: ["url", "globalVariable", "baseLocale"]` — the doc is explicit that `globalVariable`
must come **before** `baseLocale` "so `setLocale()` can store the locale during static rendering".

### 3. Why that strategy array is exactly right (traced in the runtime source)

From `dist/compiler/runtime/get-locale.js`, the strategy resolver guards the `url` branch with
`!isServer`:

```js
else if (TREE_SHAKE_URL_STRATEGY_USED && strat === "url" && !isServer && ...)
```

and `dist/bundler-plugins/unplugin.js` compiles `isServer` for Vite builds to:

```js
isServer = "import.meta.env?.SSR ?? typeof window === 'undefined'";
```

Consequences, both load-bearing:

- **At build time** (`import.meta.env.SSR === true`) the `url` strategy is skipped entirely. Only
  `globalVariable` — written by the middleware's `setLocale()` — resolves. Hence the required order.
- **In the browser bundle of a React island** (`SSR === false`) `url` resolves first, from
  `window.location`. Server and client therefore agree, which is what avoids hydration mismatch.

`dist/compiler/runtime/set-locale.js` confirms `setLocale()` is safe at build time: the `url` branch
is guarded by `typeof window !== "undefined"`, and the reload path is guarded by
`if (!isServer && optionsWithDefaults.reload && window.location && ...)`. On the server it only
assigns the module-level `_locale`. The `{ reload: false }` argument the older draft of the docs used
is genuinely unnecessary.

### 4. How the locale reaches React islands

Nothing has to be threaded manually — no context provider, no prop, no cookie.

- Astro component frontmatter and React island **server render** both read `getLocale()`, which on the
  server returns the `globalVariable` the middleware set for that page.
- The island's **client** bundle re-resolves `getLocale()` from the URL at hydration.

For our URL scheme (EN unprefixed, `/zh-hk/…` prefixed) with Paraglide's **default** URL pattern,
`dist/compiler/runtime/extract-locale-from-url.js` does:

```js
function defaultUrlPatternExtractLocale(url) {
  const pathSegments = new URL(url, "http://example.com").pathname.split("/").filter(Boolean);
  return toLocale(pathSegments[0]) || baseLocale;
}
```

So `/about` → `en`, `/zh-hk/about` → `zh-HK`, `/` → `en`. Client and server agree on every route.

`toLocale()` in `check-locale.js` is **case-insensitive and canonicalising**:

```js
const lowerValue = value.toLowerCase();
for (const locale of locales) if (locale.toLowerCase() === lowerValue) return locale;
```

This matters a lot for us — see the `zh-HK` casing note below. `assertIsLocale()` is built on
`toLocale()`, so it also canonicalises rather than requiring an exact-case match.

**Caveat:** that case-insensitivity applies **only to the built-in default URL pattern**. The doc
states verbatim: "Once you provide custom `urlPatterns`, matching follows normal `URLPattern`
semantics instead, so path casing must match your configured patterns exactly." Recommendation
below therefore deliberately avoids custom `urlPatterns`.

**Bundle note:** islands ship the message modules they import, and each compiled message module
contains every locale's variant behind a `getLocale()` switch. For chrome strings this is a few
hundred bytes. `experimentalPerLocaleBuild` would split per locale but is experimental, requires
Rolldown-powered Vite 8, and — per `docs/per-locale-build-architecture.md` — Paraglide takes
ownership of `builder.buildApp`, which Astro also owns. **Do not enable it.**

### 5. Astro-side facts (all from official Astro docs)

- **Middleware runs at build time for prerendered pages.** Verbatim from `withastro/docs`
  `guides/middleware.mdx`: *"This rendering occurs at build time for all prerendered pages, but
  occurs when the route is requested for pages rendered on demand"*. This is the mechanism the
  Paraglide SSG setup depends on.
- **`Astro.currentLocale` works on static pages.** Verbatim from `guides/internationalization.mdx`:
  *"All pages, including static prerendered pages, have access to `Astro.currentLocale`."* Its value
  is *"The locale computed from the current URL […] If the URL does not contain a `/[locale]/`
  prefix, then the value will default to `i18n.defaultLocale`."* (By contrast `Astro.preferredLocale`
  / `preferredLocaleList` are documented as on-demand-only — so **`Accept-Language` detection is not
  available on prerendered pages**. Relevant to ticket 08.)
- **Locale folders must be created by hand and named exactly.** Verbatim: *"Your folder names must
  match the items in `locales` exactly. Include a localized folder for your `defaultLocale` only if
  you configure `prefixDefaultLocale: true`."* Astro does **not** auto-duplicate pages per locale.
- **`prefixDefaultLocale: false` is the default** and gives exactly the URL shape ticket 08 prefers:
  default language unprefixed, others prefixed.
- **Custom locale `path`/`codes` mapping is unavailable to us.** Verbatim constraints for that
  feature: *"The `site` option is mandatory"*, *"The `output` option must be set to `"server"`"*, and
  *"There cannot be any individual prerendered pages."* So the Astro locale string must literally be
  the URL segment.
- **`output: 'static' | 'server'`, default `'static'`.** Individual routes opt out with
  `export const prerender = false`, which needs an adapter; *"the rest of your site will remain a
  static site"*. This is precisely our shape: static pages + one serverless search endpoint on
  `@astrojs/vercel`.
- **`build.concurrency` defaults to `1`** — *"In most cases, you should not change the default value
  of `1`."* This is what makes Paraglide's `globalVariable` strategy safe during the build (see
  Risks).

---

## Recommended setup

Locale ids: `en` (base) and **`zh-hk`** as the Astro locale / URL segment. Two workable spellings:

- **Simplest:** make the Paraglide locale `zh-hk` too. `<html lang="zh-hk">` is valid — BCP 47 tags
  are case-insensitive.
- **Canonical-looking:** keep `zh-HK` in `project.inlang` and use `zh-hk` in Astro's `i18n.locales`
  and the folder name. This works *because* `assertIsLocale()` canonicalises case (verified in
  source above) and the default URL pattern is case-insensitive. It only holds while we use the
  **default** URL pattern.

Prefer the second only if `lang="zh-HK"` in the HTML matters to Dan; otherwise take the first and
remove a moving part.

### `project.inlang/settings.json`

```json
{
  "$schema": "https://inlang.com/schema/project-settings",
  "baseLocale": "en",
  "locales": ["en", "zh-HK"],
  "modules": ["https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@4/dist/index.js"],
  "plugin.inlang.messageFormat": { "pathPattern": "./messages/{locale}.json" }
}
```

Note the in-repo example still uses the legacy `sourceLanguageTag` / `languageTags` keys; `docs/basics.md`
documents `baseLocale` / `locales`. Use the modern keys. Generate this with
`npx @inlang/paraglide-js@latest init` and then correct it, rather than hand-writing the module URLs.

### `astro.config.mjs`

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

export default defineConfig({
  output: "static",
  adapter: vercel(),
  integrations: [react()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-hk"],
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        emitTsDeclarations: true,
        strategy: ["url", "globalVariable", "baseLocale"],
        // deliberately NO urlPatterns — the default pattern gives
        // "base locale unprefixed, others prefixed" and is case-insensitive
      }),
    ],
  },
});
```

Everything above is taken from the Paraglide SSG doc's Astro config block plus the Astro config
reference; the `adapter` / `integrations` lines are ours.

### `src/middleware.ts`

```ts
import { defineMiddleware } from "astro:middleware";
import { assertIsLocale, baseLocale, setLocale } from "./paraglide/runtime.js";

export const onRequest = defineMiddleware((context, next) => {
  // the search endpoint is on-demand and locale-independent; don't touch global locale state there
  if (context.url.pathname.startsWith("/api/")) return next();

  setLocale(assertIsLocale(context.currentLocale ?? baseLocale));
  return next();
});
```

The `setLocale` line is verbatim from the docs. **The `/api/` early return is mine, not the docs'** —
rationale under Risks. An equivalent supported alternative is Paraglide's `routeStrategies` with
`{ match: "/api/:path(.*)?", exclude: true }`.

### Pages

```
src/pages/
  index.astro          → /
  about.astro          → /about
  shop/…               → /shop, /shop/[category]
  detail/[id].astro    → /detail/:id
  api/search.ts        → export const prerender = false
  zh-hk/
    index.astro        → /zh-hk
    about.astro        → /zh-hk/about
    shop/…
    detail/[id].astro
```

Astro will not generate the `zh-hk` tree for us. Keep each localized page a ~3-line shell that renders
a shared component, so the duplication is routing-only and never content:

```astro
---
import ShopPage from "../../components/pages/ShopPage.astro";
---
<ShopPage />
```

`getStaticPaths()` inside `zh-hk/detail/[id].astro` runs normally under `output: "static"` — the
conflict recorded in issue #616 only arises under `output: "server"`.

### Usage

```ts
import { m } from "./paraglide/messages.js";        // works in .astro frontmatter and React islands
import { getLocale, getTextDirection, localizeHref, locales } from "./paraglide/runtime.js";
```

`localizeHref()` is what nav links and the locale switcher should use; `locales` + `localizeHref()` is
also what the SSG doc recommends for emitting `hreflang` alternates (feeds ticket 08).

`src/paraglide/` is generated at build time by the Vite plugin (`emitGitIgnore` defaults to `true`, so
it self-ignores). Vercel needs no extra build step — `astro build` compiles it.

---

## Open risks

1. **The Astro SSG path is documented but not exercised.** The repo's only Astro example is the SSR
   one; there is no `examples/astro-ssg`, and `examples/astro/package.json` has no `test` script, so
   even the SSR example isn't covered by `pnpm test:examples`. PR #704 states its validation was
   *"Verified the documented SSG setup in a throwaway Astro `5.17.1` + Paraglide `2.11.0` fixture.
   Docs-only change; no full site build run."* We would be running it on **Astro 7.2.3 + Paraglide
   2.24.1**. **Mitigation: spike this first** — a throwaway Astro 7 project with two pages, one React
   island, and `astro build`, checking the emitted HTML for both locales and hydrating in a browser.
   Do this before the migration build depends on it.
2. **Astro 7 is two majors ahead of Paraglide's example.** Astro 7 switches to Vite 8, makes the Rust
   compiler the default, and changes `compressHTML` to `'jsx'`. None of these obviously touch
   Paraglide (whose own devDeps are on Vite 8, and whose 2.20.0 changelog explicitly tunes for
   Vite 8 / Rolldown chunking), but nobody has demonstrated the pairing. Covered by the same spike.
3. **`globalVariable` is a module-level mutable global.** Paraglide's own strategy doc warns
   *"Setting a global variable can lead to cross-request issues in server-side environments."* It is
   safe for our build only because Astro renders pages sequentially (`build.concurrency` default `1`).
   **Never raise `build.concurrency`.** Add it as a note wherever build config is documented.
4. **Same global inside the Vercel serverless function.** Our one on-demand route shares a process
   with concurrent requests. The `/api/` early return above keeps the middleware from writing locale
   state there at all. If a future on-demand route *does* need localized output, `globalVariable` is
   the wrong mechanism and it must switch to `paraglideMiddleware()` (AsyncLocalStorage-backed) or
   `overwriteGetLocale()` — do not paper over it.
5. **No `Accept-Language` redirect on a static site.** `Astro.preferredLocale` is documented as
   on-demand-only. Detect-and-redirect would require a Vercel-level redirect/middleware or an
   on-demand root route. Ticket 08 should decide this knowingly; the cheap and crawler-safe answer is
   "always land on English, visible switcher".
6. **Locale switching is a full document navigation, by design.** `setLocale()` navigates or reloads;
   `{ reload: false }` is documented as an escape hatch that is explicitly *"Never"* to be used on a
   route whose strategy includes `url`. A switcher that is an `<a href={localizeHref(path, { locale })}>`
   is the correct shape. Note the SSR example's `LocaleSwitch.astro` uses `setLocale()` from an inline
   script; either works, the link version is simpler and crawlable.
7. **Custom `urlPatterns` would forfeit case-insensitive matching**, which is what makes the
   `zh-HK` ↔ `/zh-hk/` reconciliation work. If ticket 08 later wants translated pathnames
   (e.g. `/關於`), revisit this: the casing reconciliation must then be explicit.
8. **Unverified idea worth one hour, not a recommendation:** Astro's `i18n.fallback` with
   `routing.fallbackType: "rewrite"` — *"Astro will ensure that a page is built in `src/pages/fr/`
   for every page that exists in `src/pages/es/`"* — might remove the need for the `zh-hk` page
   shells entirely, since the chrome strings would still resolve per-URL through the middleware. I
   could **not** verify from the docs whether fallback sources from the *unprefixed* default-locale
   root pages, nor what `Astro.currentLocale` reports inside a rewritten render. Test it in the
   spike; if it works it removes a whole class of file duplication, if it doesn't the shells cost
   ~6 files.

---

## Alternatives, if the spike goes badly

| Option | State | Trade-off |
| --- | --- | --- |
| **Astro built-in i18n only** (`astro:i18n` + hand-rolled message objects) | First-party, always current with Astro 7 | Astro's i18n is **routing only** — it gives you `getRelativeLocaleUrl()`, `currentLocale`, fallbacks, and nothing else. You would hand-roll the message catalogue: a plain `strings.ts` keyed by locale. For *chrome strings only* this is genuinely viable — maybe 60 keys — and has zero dependency risk. What you lose: type-safe message functions, tree-shaking, the Sherlock/inlang tooling, and pluralisation. Also, message lookup in a React island needs the locale threaded in yourself (prop from the Astro page, or read `document.documentElement.lang`). |
| **`astro-i18next`** | **Do not use.** Latest is `1.0.0-beta.21`, published **2023-03-09**, still beta, peer `astro: >=1.0.0` | Three years stale against Astro 7. The ticket named it as a candidate; it should be struck. |
| `astro-i18n` (different package) | Latest 2.2.4, 2024-01-23 | Also stale; no Astro 5/6/7 peer declaration. |
| `@astrolicious/i18n` | 0.6.3, 2025-10-20, peers `astro: ^4 \|\| ^5` | Wraps i18next. Does not declare Astro 7 support; adds a runtime i18next dependency, which is the thing Paraglide exists to avoid. |

On maintenance alone Paraglide is the strongest option in the Astro i18n space right now — it is the
only one of these published in the last four months, let alone the last week. Dan's choice holds; the
risk is *integration shape*, not library health. If the spike fails, the fallback I'd argue for is
**Astro built-in i18n + a hand-written strings module**, not another third-party integration.

---

## Hand-off notes

**For ticket 08 (URL scheme / locale routing):**
- Paraglide's default URL pattern and Astro's `prefixDefaultLocale: false` independently produce the
  same scheme: **EN unprefixed, `/zh-hk/…` prefixed**. Every existing English URL survives byte-identical.
  This is the low-friction option and both tools default to it.
- `Accept-Language` redirect-on-first-visit is **not** available on prerendered pages (risk 5).
- `hreflang` / canonical: build from `locales` + `localizeHref(currentPath, { locale })`; the SSG doc
  gives the pattern and also offers `generateStaticLocalizedUrls()` for sitemap generation.
- Paraglide has a `trailingSlash: "always" | "never"` compiler option, added in 2.24.0, specifically
  so it agrees with the framework's policy. Set it to match Astro's `trailingSlash` / `build.format`
  choice — the doc warns that mismatched policies cause redirect loops.
- If detail URLs change to slugs, Paraglide is not involved in the redirect mapping; that stays a
  Contentful-generated `redirects` list in `astro.config.mjs` or `vercel.json`.

**For ticket 09 (search endpoint):** keep the API route out of the locale middleware (risk 4). The
endpoint returns untranslated Contentful data anyway, per the map's "chrome strings only" decision.

---

## Sources

- npm registry metadata for `@inlang/paraglide-js`, `@inlang/paraglide-astro`, `@inlang/paraglide-vite`,
  `astro`, `@astrojs/react`, `@astrojs/vercel`, `astro-i18next`, `astro-i18n`, `@astrolicious/i18n`
- `@inlang/paraglide-js@2.24.1` tarball: `package.json`, `dist/compiler/runtime/{get-locale,set-locale,check-locale,extract-locale-from-url,create-runtime}.js`,
  `dist/bundler-plugins/unplugin.js`, `dist/cli/steps/detect-bundler.js`
- `github.com/opral/paraglide-js@main`: `docs/{static-site-generation,strategy,i18n-routing,basics,server-side-rendering,middleware,per-locale-build-architecture}.md`,
  `docs-api/compiler-options.md`, `CHANGELOG.md`, `examples/astro/**`, issue #616, PR #704
- `paraglidejs.com` (site map + landing page)
- `docs.astro.build`: configuration reference, API reference, guides/middleware, guides/internationalization,
  guides/on-demand-rendering, guides/upgrade-to/v7
- `github.com/withastro/docs@main`: `src/content/docs/en/guides/middleware.mdx`, `.../internationalization.mdx`
