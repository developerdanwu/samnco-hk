/**
 * Bakes Hong Kong public holidays into the bundle at build time.
 *
 * Source: the HK government's own feed at 1823.gov.hk — official, free, no API key. The
 * calendar is "Hong Kong Public Holidays" (公眾假期), which is what a shop closes on, rather
 * than the shorter statutory 勞工假期. A Traditional Chinese feed exists at the same path, so
 * the closed state can NAME the holiday instead of saying "public holiday" (issue 16).
 *
 * GOTCHA: the JSON is served with a UTF-8 BOM and fails a plain JSON.parse. It looks
 * perfectly valid until it doesn't.
 *
 * Failure is safe in both directions:
 *   - fetch fails      -> keep the committed snapshot, warn loudly, do not fail the build
 *   - data runs out    -> `lastDate` lets the client render "check our hours" rather than
 *                         assuming the shop is open
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = "src/data/holidays.json";
const FEEDS = {
  en: "https://www.1823.gov.hk/common/ical/en.json",
  zh: "https://www.1823.gov.hk/common/ical/tc.json",
};

const stripBom = (s) => s.replace(/^﻿/, "");

async function feed(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const data = JSON.parse(stripBom(await res.text()));
  const events = data?.vcalendar?.[0]?.vevent;
  if (!Array.isArray(events) || !events.length) throw new Error(`${url} returned no events`);
  return new Map(
    events.map((e) => {
      const d = e.dtstart?.[0] ?? "";
      return [`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, e.summary ?? ""];
    }),
  );
}

try {
  const [en, zh] = await Promise.all([feed(FEEDS.en), feed(FEEDS.zh)]);
  const dates = [...en.keys()].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dates.length) throw new Error("no valid dates parsed");

  const payload = {
    source: FEEDS.en,
    fetchedAt: new Date().toISOString().slice(0, 10),
    // Past this date the data is exhausted and the client must NOT assume "open".
    lastDate: dates[dates.length - 1],
    holidays: dates.map((date) => ({ date, en: en.get(date) ?? "", zh: zh.get(date) ?? "" })),
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`✓ ${payload.holidays.length} HK public holidays, through ${payload.lastDate}`);
} catch (err) {
  if (existsSync(OUT)) {
    const snap = JSON.parse(readFileSync(OUT, "utf8"));
    console.warn(`\n⚠  Could not refresh HK holidays: ${err.message}`);
    console.warn(`⚠  Using the committed snapshot (fetched ${snap.fetchedAt}, through ${snap.lastDate}).`);
    console.warn(`⚠  The build continues, but refresh this before ${snap.lastDate}.\n`);
  } else {
    console.error(`✗ Could not fetch HK holidays and no snapshot exists: ${err.message}`);
    process.exit(1);
  }
}
