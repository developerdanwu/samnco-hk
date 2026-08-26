import type { APIRoute } from "astro";
import { detailPathnames, shopPathnames } from "../lib/shop-paths.ts";

/**
 * The sitemap is generated here rather than by @astrojs/sitemap.
 *
 * That integration only sees routes that exist at build time; under `output: "server"` nothing
 * is prerendered, so it would emit an empty sitemap for a 700-page catalogue. This endpoint
 * reads the same Contentful data the pages do, and is itself served through ISR — the publish
 * webhook purges it alongside the shop pages.
 */
export const prerender = false;

const HREFLANG: Record<string, string> = { en: "en", "zh-hk": "zh-HK" };
const LOCALES = ["en", "zh-hk"] as const;

/** /about?/foo for en, /zh-hk/foo for the prefixed locale. Mirrors Base.astro's alternates. */
const localized = (locale: string, path: string) => (locale === "en" ? path : `/zh-hk${path}`);

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => `&${{ "<": "lt", ">": "gt", "&": "amp", "'": "apos", '"': "quot" }[c]};`);

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL("https://www.samnco-hk.shop")).origin;

  // 404 is deliberately absent — it is not a destination.
  const paths = ["/", "/about", ...(await shopPathnames()), ...(await detailPathnames())];

  const urls = LOCALES.flatMap((locale) =>
    paths.map((path) => {
      const loc = `${origin}${localized(locale, path)}`;
      // Every URL carries the full alternate set, so the sitemap states the same hreflang
      // relationships as the pages themselves.
      const alternates = LOCALES.map(
        (alt) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG[alt]}" href="${escapeXml(`${origin}${localized(alt, path)}`)}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${alternates}\n  </url>`;
    }),
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
