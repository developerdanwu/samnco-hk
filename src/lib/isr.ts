import { ISR_BYPASS_TOKEN, PUBLIC_SITE_URL } from "astro:env/server";

/**
 * Vercel on-demand ISR helpers — the samnco port of sleekflow-website's `astro-isr.ts`.
 *
 * Vercel has no invalidate-without-render primitive: a purge request IS a render. A HEAD to
 * the public URL carrying `x-prerender-revalidate: <bypassToken>` evicts the cached entry and
 * rebuilds it in one go. So the purge set has to be capped and throttled, or one Contentful
 * publish turns into a render storm.
 */

/**
 * Sent alongside the purge so the instance that re-renders drops its in-process Contentful
 * cache first (see `src/middleware.ts`). Without it a page purged seconds after a publish can
 * be re-rendered from the pre-publish catalogue and cached that way until the next purge.
 */
export const REVALIDATE_HEADER = "x-samnco-revalidate";

/** Bounds on the fan-out. ~50 paths is a full catalogue purge (both locales) today. */
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_PATHS = 120;

export type PurgeResult =
  | { path: string; ok: true; status: number }
  | { path: string; ok: false; error: string };

export interface PurgeReport {
  attempted: number;
  succeeded: number;
  failed: number;
  results: PurgeResult[];
  /** True when ISR_BYPASS_TOKEN is unset — nothing was purged, and that is reported, not hidden. */
  skippedNoToken: boolean;
  /** Paths dropped because the set exceeded `maxPaths`. Never silently truncated. */
  skippedOverLimit: string[];
}

export interface PurgeOptions {
  /** Public origin serving the site. Defaults to `siteOrigin()`. */
  origin?: string;
  concurrency?: number;
  maxPaths?: number;
}

/**
 * Public origin to purge against. On Vercel the deployment URL is not the canonical host, and
 * ISR entries are keyed per host, so production must purge the canonical origin.
 */
export function siteOrigin(): string {
  const explicit = PUBLIC_SITE_URL?.trim();
  if (explicit) return normalizeOrigin(explicit);
  if (process.env.VERCEL_ENV === "production") return "https://www.samnco-hk.shop";
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeOrigin(vercelUrl);
  return "http://localhost:4321";
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Constant-time-ish compare, so a wrong secret cannot be probed byte by byte. */
export function tokenMatches(candidate: string | null | undefined, secret: string): boolean {
  if (!candidate || candidate.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

/**
 * Invalidate the Vercel ISR cache for `paths` by re-rendering each one.
 * Never throws: every path's outcome is reported so the webhook can answer honestly.
 */
export async function purgeIsrForPaths(paths: string[], options: PurgeOptions = {}): Promise<PurgeReport> {
  const token = ISR_BYPASS_TOKEN;
  if (!token) {
    return { attempted: 0, succeeded: 0, failed: 0, results: [], skippedNoToken: true, skippedOverLimit: [] };
  }

  const origin = (options.origin ?? siteOrigin()).replace(/\/$/, "");
  const deduped = Array.from(new Set(paths.filter((p) => p.startsWith("/"))));
  const maxPaths = options.maxPaths ?? DEFAULT_MAX_PATHS;
  const targets = deduped.slice(0, maxPaths);
  const skippedOverLimit = deduped.slice(maxPaths);

  if (skippedOverLimit.length > 0) {
    console.warn(
      `[isr] purge set of ${deduped.length} exceeds the ${maxPaths}-path ceiling; ` +
        `${skippedOverLimit.length} not purged (they refresh on the next publish or deploy)`,
      skippedOverLimit,
    );
  }

  const purgeOne = async (path: string) => {
    const res = await fetch(`${origin}${path}`, {
      method: "HEAD",
      headers: { "x-prerender-revalidate": token, [REVALIDATE_HEADER]: token },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.status;
  };

  const results: PurgeResult[] = [];
  let succeeded = 0;
  let failed = 0;

  const settled = await mapWithConcurrency(
    targets,
    Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY),
    purgeOne,
  );

  settled.forEach((result, i) => {
    const path = targets[i];
    if (result.status === "fulfilled") {
      succeeded++;
      results.push({ path, ok: true, status: result.value });
    } else {
      failed++;
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      results.push({ path, ok: false, error });
      console.error(`[isr] failed to purge ${path}: ${error}`);
    }
  });

  return { attempted: targets.length, succeeded, failed, results, skippedNoToken: false, skippedOverLimit };
}

/** `Promise.allSettled` with at most `limit` in flight, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await run(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
