import { defineMiddleware } from "astro:middleware";
import { assertIsLocale, baseLocale, setLocale } from "./paraglide/runtime.js";
import { invalidateProducts } from "./lib/contentful.ts";
import { REVALIDATE_HEADER, tokenMatches } from "./lib/isr.ts";
import { tagCatalogueResponse } from "./lib/cache-tags.ts";
import { ISR_BYPASS_TOKEN } from "astro:env/server";

export const onRequest = defineMiddleware(async (context, next) => {
  // An ISR purge is a re-render on some warm instance that may still hold a pre-publish
  // catalogue. The purge fan-out carries the bypass token, so drop the cache before rendering
  // — otherwise the purge would faithfully rebuild the stale page (see src/lib/isr.ts).
  if (ISR_BYPASS_TOKEN && tokenMatches(context.request.headers.get(REVALIDATE_HEADER), ISR_BYPASS_TOKEN)) {
    invalidateProducts();
  }

  // The search endpoint is on-demand and locale-independent — never touch global locale
  // state for it (issue 03). It is excluded from ISR too, so there is nothing to tag.
  if (context.url.pathname.startsWith("/api/")) return next();

  setLocale(assertIsLocale(context.currentLocale ?? baseLocale));

  // Tagged here rather than in each route: every page renders the catalogue somewhere, so the
  // tag belongs to the request, not to nine near-identical page shells.
  await tagCatalogueResponse();
  return next();
});
