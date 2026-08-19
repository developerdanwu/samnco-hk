/**
 * Guards a SILENT failure. Paraglide's `globalVariable` strategy is a mutable module global;
 * if `build.concurrency` is raised above 1, parallel page renders race it and a fraction of
 * pages prerender in the WRONG LOCALE — while the build still exits 0.
 *
 * Reproduced in .scratch/astro-migration/issues/11: at concurrency 8 with realistic async
 * work, 13 of 122 pages were wrong. At the default of 1, none.
 *
 * Checks two things that stay true as the site grows:
 *   1. <html lang> matches the URL. lang and message text are read from the same global in
 *      the same render pass, so a raced render gets both wrong together — lang is a reliable
 *      proxy and, unlike a content string, it is on every page forever.
 *   2. Route parity — every English route has a zh-hk counterpart. Catches a localised page
 *      that was forgotten rather than mistranslated.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = ".vercel/output/static";
const LOCALE_DIR = "zh-hk";

function* htmlFiles(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (e.endsWith(".html")) yield p;
  }
}

const bad = [];
const routes = { en: new Set(), [LOCALE_DIR]: new Set() };

for (const file of htmlFiles(ROOT)) {
  const rel = relative(ROOT, file);
  const parts = rel.split(sep);
  const isLocalised = parts[0] === LOCALE_DIR;
  const expected = isLocalised ? LOCALE_DIR : "en";
  routes[expected].add(parts.slice(isLocalised ? 1 : 0).join("/"));

  const lang = readFileSync(file, "utf8").match(/<html[^>]*lang="([^"]*)"/)?.[1];
  if (lang !== expected) bad.push(`${rel}: lang="${lang ?? "(none)"}" — expected "${expected}"`);
}

const checked = routes.en.size + routes[LOCALE_DIR].size;
if (!checked) {
  console.error(`✗ no HTML in ${ROOT} — run \`npm run build\` first`);
  process.exit(1);
}

const missing = [...routes.en].filter((r) => !routes[LOCALE_DIR].has(r));
const orphan = [...routes[LOCALE_DIR]].filter((r) => !routes.en.has(r));

if (bad.length) {
  console.error(`✗ ${bad.length} page(s) prerendered in the wrong locale, of ${checked}:`);
  for (const b of bad.slice(0, 15)) console.error("   " + b);
  console.error("\n  Is build.concurrency above 1? It must stay at the default of 1.");
}
for (const r of missing) console.error(`✗ no ${LOCALE_DIR} counterpart for /${r}`);
for (const r of orphan) console.error(`✗ ${LOCALE_DIR}/${r} has no English counterpart`);

if (bad.length || missing.length || orphan.length) process.exit(1);
console.log(`✓ ${checked} pages — every locale correct, every route present in both`);
