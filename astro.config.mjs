import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

// output:"static" + adapter. `hybrid` was REMOVED in Astro 7 and hard-errors (issue 04).
// Routes opt out per-file with `export const prerender = false`.
export default defineConfig({
  site: "https://www.samnco-hk.shop",
  output: "static",
  adapter: vercel(),
  integrations: [
    react(),
    // Emits both locale trees with xhtml:link alternates, so the sitemap carries the same
    // hreflang relationships as the pages themselves.
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", "zh-hk": "zh-HK" } },
      filter: (page) => !page.includes("/404"),
    }),
  ],
  // Typed, validated env. A missing credential fails the build immediately with a clear
  // message rather than surfacing as an opaque 404 from Contentful at page-render time.
  env: {
    schema: {
      CONTENTFUL_SPACE_ID: envField.string({ context: "server", access: "secret" }),
      CONTENTFUL_DELIVERY_TOKEN: envField.string({ context: "server", access: "secret" }),
      CONTENTFUL_ENVIRONMENT: envField.string({ context: "server", access: "secret", default: "master" }),
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-hk"],
    routing: { prefixDefaultLocale: false },
  },
  // DO NOT set build.concurrency above 1. Paraglide's `globalVariable` strategy is a mutable
  // module global; parallel page renders race it and pages silently get the WRONG LOCALE while
  // the build still exits 0. Reproduced in issue 11 — `npm run check:locales` guards it.
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
