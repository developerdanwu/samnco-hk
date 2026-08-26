import { addCacheTag, invalidateByTag } from "@vercel/functions";

/**
 * Tag-based ISR invalidation.
 *
 * `x-prerender-revalidate` only works per URL — a purge IS a render, so it needs a concrete
 * path, and enumerating them means the purge set can disagree with what is actually cached
 * (a page that no longer exists in the current pagination is never purged and keeps serving
 * a stale 200). Cache tags invert that: every rendered page tags itself, and one
 * `invalidateByTag` call marks every entry carrying the tag stale, whatever it is.
 *
 * Invalidation is lazy — the next request serves the stale copy and re-renders in the
 * background — so a publish costs one render per page actually visited, not 55 up front.
 *
 * A cached response's raw headers are not available to an ISR function, so `Vercel-Cache-Tag`
 * cannot be used here; `addCacheTag()` is the documented route for ISR.
 */

/**
 * One tag on every page, because every page is derived from the catalogue: /shop and /detail
 * directly, and every other page through Base.astro's footer counts. Product-level tags would
 * be finer, but no page depends on exactly one product — the related strip on a detail page
 * and the counts in the footer both move when any product does.
 */
export const CATALOGUE_TAG = "catalogue";

/** Vercel's cache-tag APIs only exist inside the Vercel runtime; locally they are a no-op. */
const onVercel = () => Boolean(process.env.VERCEL);

/**
 * Tag the response being rendered. Never throws: a failed tag must not take a page down, it
 * only means that page waits for the next deploy to refresh — so it is logged, loudly.
 */
export async function tagCatalogueResponse(): Promise<void> {
  if (!onVercel()) return;
  try {
    await addCacheTag(CATALOGUE_TAG);
  } catch (error) {
    console.error("[cache-tags] addCacheTag failed — this page will not be invalidated by tag:", error);
  }
}

/**
 * Mark every catalogue-derived page stale. Returns false when tagging is unavailable or the
 * call failed, so the caller can fall back to purging paths explicitly.
 */
export async function invalidateCatalogue(): Promise<boolean> {
  if (!onVercel()) return false;
  try {
    await invalidateByTag(CATALOGUE_TAG);
    return true;
  } catch (error) {
    console.error("[cache-tags] invalidateByTag failed:", error);
    return false;
  }
}
