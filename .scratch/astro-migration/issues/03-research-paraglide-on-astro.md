# Research Paraglide JS on Astro

Type: research
Status: resolved
Blocked by: —

## Question

Paraglide was chosen for chrome-string i18n at charting. Verify it actually composes with this
stack before the build depends on it, and establish the setup that will be used.

- **Current Paraglide version and its Astro story.** Is there a maintained Astro integration, or is
  it the framework-agnostic compiler wired in by hand? Confirm against primary sources (inlang docs,
  the package's own README) — not blog posts.
- **How message functions reach React islands.** Paraglide compiles messages to tree-shakeable
  functions; confirm that calling them inside a React island hydrated by Astro works, and what the
  locale has to be threaded through (context, prop, cookie, or a global set per request).
- **Routing strategy.** How Paraglide expects locale to be represented in URLs, and what it offers
  for locale detection and switching. Feeds directly into the URL/locale routing ticket.
- **Interaction with static prerendering.** The site prerenders at build time. Confirm both locales
  can be prerendered as separate static routes, rather than the locale being resolved only at
  request time.
- **Alternatives, briefly**, in case Paraglide's Astro support is thin: Astro's own built-in i18n
  routing, or `astro-i18next`. State the trade-off rather than silently substituting — Paraglide was
  Dan's explicit choice.

Capture findings as a Markdown file in the repo and link it from the answer.

## Answer

**Paraglide holds for this stack, with one unvalidated path that must be spiked before the build
depends on it.**

Findings: [`../research/03-paraglide-on-astro.md`](../research/03-paraglide-on-astro.md).
Verified against `@inlang/paraglide-js` 2.24.1, `astro` 7.2.3, `@astrojs/vercel` 11.0.6, from the
npm tarball's compiled runtime source and the `opral/paraglide-js` repo (docs, Astro example,
issue #616 / PR #704) — not from blog posts.

- **No Astro integration; that is by design.** `@inlang/paraglide-astro` is formally deprecated on
  npm. Paraglide 2.x is a framework-agnostic compiler wired in as a **Vite plugin** inside
  `astro.config.mjs`. Deprecation here signals a deliberate architecture change, not abandonment.
- **The in-repo Astro example is the wrong one for us.** It demonstrates **SSR**
  (`output: "server"` + `paraglideMiddleware()`). Our site is prerendered. The **SSG** path is
  documented separately: `output: "static"`, Astro's `i18n` config, and middleware calling
  `setLocale(assertIsLocale(context.currentLocale ?? baseLocale))` with strategy
  `["url", "globalVariable", "baseLocale"]`. **Do not copy the example.**
- **React islands need no locale threading** — no context, no prop, no cookie. Traced in the runtime
  source: `isServer` compiles to `import.meta.env.SSR`, so the build resolves locale from the global
  the middleware set while the island's client bundle re-resolves from `window.location`. The two
  agree, so there is no hydration mismatch.
- **Both locales prerender as separate static routes.** English stays unprefixed, Chinese sits under
  `/zh-hk/…`. Astro's and Paraglide's defaults independently agree on this — which means **every
  indexed English URL survives unchanged**, a materially better starting position for the URL ticket
  than assumed at charting.
- **`astro-i18next` is struck from the alternatives** — last published 2023-03-09 and still beta.
  Astro's own built-in i18n routing remains the fallback if the spike fails.

### Constraints this imposes on later tickets

- **The Astro-SSG path has no example project and no test.** PR #704 validated it only in a
  throwaway Astro 5.17.1 + Paraglide 2.11.0 fixture, docs-only. We would run Astro 7 + Paraglide
  2.24.1. Spiked separately — see ticket 11.
- **`build.concurrency` must stay at its default of 1.** The `globalVariable` strategy is a mutable
  module global; parallel page builds would race it. Raising concurrency for build speed would
  silently corrupt locale resolution.
- **The `/api/` route must be excluded from the locale middleware.** Relevant to ticket 09.
- **`Accept-Language` redirection is unavailable on prerendered pages.** Ticket 08 must decide
  locale detection knowing this, rather than assuming a redirect is available.
