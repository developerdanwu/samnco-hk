import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { existsSync } from "node:fs";

// astro.config runs BEFORE Astro loads .env into the app, so `process.env` here is the raw
// shell environment: on Vercel the project's env vars are already there, but locally a token
// in .env would be invisible and the ISR function would silently build with NO bypass token.
if (existsSync(".env")) process.loadEnvFile(".env");

// output:"server" + Vercel on-demand ISR. Every page reads the Contentful catalogue (the shop
// and detail routes directly, every other page through Base.astro's footer counts), so the whole
// site is rendered on demand and cached at the edge until a publish purges it. `hybrid` was
// REMOVED in Astro 7 and hard-errors (issue 04); the ISR config below is only honoured when the
// build output is "server", so "static" + adapter is not an option here.
export default defineConfig({
  site: "https://www.samnco-hk.shop",
  output: "server",
  // The adapter emits the Build Output API config itself (routing, the ISR function and its
  // bypass token, and the excluded /api functions), so vercel.json deliberately carries NO
  // build, output or function configuration — only response headers, which the adapter never sets.
  // Note vercel.json admits no comments of any kind: a "//" key fails schema validation.
  adapter: vercel({
    // On-demand ISR with NO expiration: an entry lives until the next deploy or until the
    // Contentful webhook purges it with `x-prerender-revalidate` (src/pages/api/contentful/
    // revalidate.ts). A timer would re-render 700+ pages on a catalogue that changes weekly.
    isr: {
      bypassToken: process.env.ISR_BYPASS_TOKEN,
      // ISR handlers STRIP the query string, so anything that varies by search param must opt
      // out: /api/search would otherwise cache the first query's results for every query.
      exclude: [/^\/api\/.+/],
    },
  }),
  integrations: [react()],
  // Typed, validated env. A missing credential fails the build immediately with a clear
  // message rather than surfacing as an opaque 404 from Contentful at page-render time.
  env: {
    schema: {
      CONTENTFUL_SPACE_ID: envField.string({ context: "server", access: "secret" }),
      CONTENTFUL_DELIVERY_TOKEN: envField.string({ context: "server", access: "secret" }),
      CONTENTFUL_ENVIRONMENT: envField.string({ context: "server", access: "secret", default: "master" }),
      // ISR secrets are optional so `astro dev` and local builds work without them: with no
      // bypass token the site simply renders on demand and purges are reported as skipped,
      // rather than the build failing on a credential only production needs.
      ISR_BYPASS_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      CONTENTFUL_WEBHOOK_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      // Canonical origin to purge. ISR entries are keyed per host, so production must not purge
      // the deployment URL. Falls back to the known production host (src/lib/isr.ts).
      PUBLIC_SITE_URL: envField.string({ context: "server", access: "public", optional: true }),
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-hk"],
    routing: { prefixDefaultLocale: false },
  },
  // Paraglide's `globalVariable` strategy is a mutable module global. It was a build hazard
  // while pages were prerendered (issue 11: concurrent renders raced it and pages silently got
  // the WRONG LOCALE); under `output: "server"` the same global is now set per request by
  // src/middleware.ts, so keep renders serial and do not raise build.concurrency.
  vite: {
    plugins: [
      tailwindcss(),
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        emitTsDeclarations: true, // requires `typescript` installed, or the build fails
        strategy: ["url", "globalVariable", "baseLocale"],
      }),
    ],
  },
});
