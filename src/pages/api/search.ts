import type { APIRoute } from "astro";
import { searchProducts } from "../../lib/contentful.ts";

/**
 * The only server that survives the Flask deletion.
 *
 * On-demand: prerendering a search endpoint would freeze results at deploy time. Excluded from
 * the Paraglide locale middleware — product data is English-only, so search is
 * locale-independent (issues 03, 09).
 */
export const prerender = false;

const MIN_Q = 2;
const MAX_Q = 64;
const MAX_LIMIT = 24;

const json = (body: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The catalogue is effectively frozen, so an hour at the edge is safe. This is also the
      // primary defence against quota abuse: a scraper mostly hits Vercel, not Contentful.
      ...(cache ? { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } : {}),
    },
  });

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_Q || q.length > MAX_Q) {
    return json({ ok: false, data: null, error: `q must be ${MIN_Q}-${MAX_Q} characters` }, 400);
  }
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 12));

  try {
    const { items, total } = await searchProducts(q, limit);
    return json({ ok: true, data: { items, total, query: q }, error: null }, 200, true);
  } catch {
    // Never surface the upstream body — it echoes the query shape.
    return json({ ok: false, data: null, error: "search unavailable" }, 502);
  }
};
