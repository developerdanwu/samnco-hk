/**
 * Guards a SILENT failure. Paraglide's `globalVariable` strategy is a mutable module global;
 * a render that races it produces a page in the WRONG LOCALE while everything still exits 0.
 *
 * Reproduced in .scratch/astro-migration/issues/11: at build concurrency 8 with realistic
 * async work, 13 of 122 pages were wrong. At the default of 1, none.
 *
 * Under `output: "server"` there are no prerendered HTML files left to scan, so the check has
 * two halves:
 *   1. Route parity, from src/pages — every English route has a zh-hk counterpart. Always runs.
 *   2. <html lang> matches the URL, against a RUNNING server. lang and message text are read
 *      from the same global in the same render pass, so a raced render gets both wrong
 *      together — lang is a reliable proxy and it is on every page forever.
 *
 * Usage:
 *   npm run check:locales                            # route parity only
 *   npm run check:locales -- http://localhost:4321   # parity + live locale check
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PAGES = "src/pages";
const LOCALE_DIR = "zh-hk";

// 404 is exempt from parity: it self-localises at runtime from window.location rather than
// existing once per locale — see src/components/NotFoundPage.astro.
const EXEMPT = /(^|\/)404\.astro$/;

function* pageFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* pageFiles(path);
    else if (entry.endsWith(".astro")) yield path;
  }
}

const routes = { en: new Set(), [LOCALE_DIR]: new Set() };

for (const file of pageFiles(PAGES)) {
  const rel = relative(PAGES, file);
  if (EXEMPT.test(rel)) continue;
  const parts = rel.split(sep);
  const isLocalised = parts[0] === LOCALE_DIR;
  const key = isLocalised ? LOCALE_DIR : "en";
  routes[key].add(parts.slice(isLocalised ? 1 : 0).join("/"));
}

const missing = [...routes.en].filter((r) => !routes[LOCALE_DIR].has(r));
const orphan = [...routes[LOCALE_DIR]].filter((r) => !routes.en.has(r));
for (const r of missing) console.error(`✗ no ${LOCALE_DIR} counterpart for /${r}`);
for (const r of orphan) console.error(`✗ ${LOCALE_DIR}/${r} has no English counterpart`);

let failed = missing.length > 0 || orphan.length > 0;
if (!failed) {
  console.log(`✓ ${routes.en.size} route(s) present in both locales`);
}

// Half 2: live locale check. Skipped without a base URL, because the pages are on demand now
// and there is nothing on disk to read.
const baseUrl = process.argv[2]?.replace(/\/$/, "");
if (!baseUrl) {
  console.log("• no base URL given — skipping the live <html lang> check (see this file's header)");
  process.exit(failed ? 1 : 0);
}

// One sample per route shape, both locales. Enough to catch a raced global; a full crawl of
// 700 detail pages would be a load test, not a check.
const SAMPLES = ["/", "/about", "/shop", "/shop/lifestyle", "/shop/page/2"];
const bad = [];

for (const path of SAMPLES) {
  for (const [locale, url] of [
    ["en", `${baseUrl}${path}`],
    [LOCALE_DIR, `${baseUrl}/${LOCALE_DIR}${path === "/" ? "" : path}`],
  ]) {
    let html;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        bad.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      html = await res.text();
    } catch (error) {
      bad.push(`${url}: ${error.message}`);
      continue;
    }
    const lang = html.match(/<html[^>]*lang="([^"]*)"/)?.[1];
    if (lang !== locale) bad.push(`${url}: lang="${lang ?? "(none)"}" — expected "${locale}"`);
  }
}

if (bad.length) {
  failed = true;
  console.error(`✗ ${bad.length} response(s) in the wrong locale or unreachable:`);
  for (const b of bad) console.error("   " + b);
  console.error("\n  A wrong locale here means concurrent requests raced Paraglide's global.");
} else {
  console.log(`✓ ${SAMPLES.length * 2} live responses — every locale correct`);
}

process.exit(failed ? 1 : 0);
