import type { APIRoute } from "astro";
import { CONTENTFUL_WEBHOOK_SECRET } from "astro:env/server";
import { invalidateProducts } from "../../../lib/contentful.ts";
import { purgeIsrForPaths, tokenMatches } from "../../../lib/isr.ts";
import { CATALOGUE_TAG, invalidateCatalogue } from "../../../lib/cache-tags.ts";
import { shopPathnames } from "../../../lib/shop-paths.ts";

/**
 * POST /api/contentful/revalidate
 *
 * Contentful publish/unpublish webhook → purge the Vercel ISR cache for the paths a product
 * change can affect. Configure it in Contentful under Settings → Webhooks:
 *   URL     POST https://www.samnco-hk.shop/api/contentful/revalidate
 *   Trigger Entry: publish, unpublish, delete, archive
 *   Header  x-contentful-webhook-secret: <CONTENTFUL_WEBHOOK_SECRET>   (secret header)
 *
 * Excluded from ISR by the adapter (all of /api/* is), so this handler always runs live.
 */
export const prerender = false;

const SECRET_HEADER = "x-contentful-webhook-secret";
const CONTENT_TYPE = "samAndCoProducts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const LOCALE_PREFIXES = ["", "/zh-hk"] as const;

/**
 * Both locale trees of every path. The zh-hk tree renders the same catalogue, so a publish
 * invalidates it identically — purging only the English tree leaves half the site stale.
 */
const bothLocales = (paths: string[]): string[] =>
  paths.flatMap((path) => LOCALE_PREFIXES.map((prefix) => `${prefix}${path}` || "/"));

export const POST: APIRoute = async ({ request }) => {
  if (!CONTENTFUL_WEBHOOK_SECRET) {
    console.error("[revalidate] CONTENTFUL_WEBHOOK_SECRET is not configured");
    return json({ ok: false, data: null, error: "webhook not configured" }, 500);
  }
  if (!tokenMatches(request.headers.get(SECRET_HEADER), CONTENTFUL_WEBHOOK_SECRET)) {
    return json({ ok: false, data: null, error: "unauthorized" }, 401);
  }

  // The body is informational only — the purge set does not depend on it, so a malformed or
  // empty payload still purges rather than failing. Contentful sends a JSON entry.
  let entryId: string | null = null;
  try {
    const payload = await request.json();
    const id = payload?.sys?.id;
    entryId = typeof id === "string" ? id : null;
    const type = payload?.sys?.contentType?.sys?.id;
    if (typeof type === "string" && type !== CONTENT_TYPE) {
      return json({ ok: true, data: { revalidated: false, reason: "unrelated_content_type", type }, error: null });
    }
  } catch {
    // Contentful always sends JSON; a body we cannot read is not a reason to skip the purge.
    console.warn("[revalidate] unreadable webhook body — purging anyway");
  }

  // This instance's catalogue is now stale; the purge requests carry the bypass header so the
  // instances that actually re-render drop theirs too (src/middleware.ts).
  invalidateProducts();

  // One call marks every catalogue-derived page stale, whatever is actually cached — including
  // pages an enumerated purge set would miss, like a /shop/page/N that the delete just removed.
  // Invalidation is lazy, so this does not re-render anything until someone asks for it.
  if (await invalidateCatalogue()) {
    return json({ ok: true, data: { revalidated: true, entryId, method: "tag", tag: CATALOGUE_TAG }, error: null });
  }

  // Fallback: tags are a Vercel-runtime feature, so locally — and if the tag call ever fails —
  // fall back to purging the paths by URL. Adding or removing one product reflows page
  // boundaries across the whole shop tree, so it is purged as a set. Detail pages are not:
  // 348 x 2 of them would blow past the ceiling for a one-word title edit.
  const shop = await shopPathnames();
  const paths = [
    // One locale-independent route: the sitemap lists both trees from a single URL.
    "/sitemap.xml",
    ...bothLocales(["/", "/about", ...shop, ...(entryId ? [`/detail/${entryId}`] : [])]),
  ];

  const purge = await purgeIsrForPaths(paths);
  if (purge.skippedNoToken) {
    console.warn("[revalidate] ISR_BYPASS_TOKEN is not set — nothing was purged:", paths.length, "paths");
  }

  return json({
    ok: true,
    data: {
      revalidated: purge.succeeded > 0,
      entryId,
      method: "paths",
      attempted: purge.attempted,
      succeeded: purge.succeeded,
      failed: purge.failed,
      overLimit: purge.skippedOverLimit.length,
      skippedNoToken: purge.skippedNoToken,
    },
    error: null,
  });
};

/** A GET is almost always a misconfigured webhook; say so instead of 404ing silently. */
export const GET: APIRoute = () =>
  json({ ok: false, data: null, error: "use POST with the webhook secret header" }, 405);
