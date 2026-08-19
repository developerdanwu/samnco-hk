import { defineMiddleware } from "astro:middleware";
import { assertIsLocale, baseLocale, setLocale } from "./paraglide/runtime.js";

export const onRequest = defineMiddleware((context, next) => {
  // The search endpoint is on-demand and locale-independent — never touch global locale
  // state for it (issue 03).
  if (context.url.pathname.startsWith("/api/")) return next();

  setLocale(assertIsLocale(context.currentLocale ?? baseLocale));
  return next();
});
