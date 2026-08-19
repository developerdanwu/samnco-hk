# Scaffold the Astro project

Type: task
Status: resolved
Blocked by: —

## Question

Stand up the skeleton on branch \`astro-migration\`, proven by a green build — not by inspection.

Per ticket 04: \`npx shadcn@latest init -t astro -b base -p nova -y --no-monorepo\`, with path aliases
in \`tsconfig.json\` **first** or init fails. Astro 7 + @astrojs/react + @astrojs/vercel + Tailwind 4 +
`@base-ui/react`. `output: "static"` with the adapter — **`hybrid` was removed and hard-errors**.

Per ticket 11: Paraglide as a **Vite plugin**, not the deprecated integration; `emitTsDeclarations`
needs `typescript` installed; locale spelling `zh-hk` everywhere; middleware skips `/api/`;
**never raise `build.concurrency`** — copy `research/spike-check-locales.mjs` in as a build-time
regression test, since the failure is silent.

Drop in `design-tokens/global.css` (ticket 06) — keep its `@theme inline` block or the build dies —
and `copy/en.json` + `copy/zh-hk.json` (ticket 07, 95 messages).

Done when: both locales prerender, a React island hydrates with no mismatch, `/api/*` runs
on-demand, and the locale regression test passes.

## Answer

**Done, on branch `astro-migration`. Verified by building and driving it in a browser, not by
inspection.**

Installed at the versions ticket 04 verified: `astro` 7.2.3, `@astrojs/react` 6.0.3,
`@astrojs/vercel` 11.0.6, `react`/`react-dom` 19.2.8, `@inlang/paraglide-js` 2.24.1,
`tailwindcss` + `@tailwindcss/vite` 4.3.3, `@base-ui/react` via shadcn, `@tanstack/react-query`,
`typescript`. **Zero Radix packages.**

### Verified

| check | result |
| --- | --- |
| Both locales prerender, English unprefixed | `/index.html` + `/zh-hk/index.html` |
| `<html lang>` correct per locale | `en` / `zh-hk` |
| React island hydrates, right locale, no threading | pass, both locales |
| **No hydration mismatch** | headless Chromium, zero console output |
| React actually interactive | click increments |
| Our fonts load | `Newsreader, "Iowan Old Style", Georgia, serif` |
| **shadcn Button uses our radius, not shadcn's** | `2px`, not `10px` |
| `/api/search` on-demand, not prerendered | `^/api/search/?$` → `_render` |
| Locale regression test | passes, **and proven to fail** on a corrupted page |

### Two traps hit for real

**1. `shadcn init` silently reverted the design.** Run against an existing `global.css`, it
**rewrote `:root`** with its stock neutral greys, **added a `.dark` block** we had ruled out, and
**overrode `--font-sans` with Geist** — pulling in `@fontsource-variable/geist`. Nothing errored;
the site simply became stock shadcn. **Order matters: run `shadcn init` FIRST, then apply the tokens
file.** A comment at the top of `global.css` now says so. Its two extra radius steps were kept; its
sidebar and chart variables were not — a brochure site has neither.

**2. The Google Fonts `@import` was being ignored.** Placed after `@theme`, it violates the rule
that `@import` must precede all rules; the bundler warned, and **browsers drop it silently** — the
site would have shipped with Georgia and system sans, looking almost right. Fixed by moving fonts to
`<link>` in `Base.astro` with `preconnect`, which is also faster: a CSS `@import` serialises the font
request behind the stylesheet, delaying text on the LCP element.

### The regression test is real, not decorative

`npm run check:locales` guards the silent `build.concurrency` race. It was rewritten from the spike
version to survive the site growing: it checks **`<html lang>` against the URL** (lang and message
text are read from the same global in the same render pass, so a raced render gets both wrong
together — and unlike a content string, `lang` is on every page forever) and **route parity**, so a
forgotten zh-hk page is caught too. **Proven to fail**: corrupting one page's `lang` exits 1 with the
concurrency hint.

### Scaffold-only, deleted later

`src/components/LocaleProbe.tsx` and the two placeholder `index.astro` pages exist to prove
hydration and locale resolution. Ticket 19 replaces them. `src/pages/api/search.ts` is a validating
stub — ticket 23 implements it.
