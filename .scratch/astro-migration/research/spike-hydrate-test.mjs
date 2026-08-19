import { chromium } from "playwright";

const browser = await chromium.launch();
let failures = 0;

for (const [path, expect] of [["/", {locale:"en", shop:"Sam and Company"}],
                              ["/zh-hk/", {locale:"zh-hk", shop:"三和文儀公司"}]]) {
  const page = await browser.newPage();
  const msgs = [];
  page.on("console", m => msgs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", e => msgs.push({ type: "pageerror", text: String(e) }));

  await page.goto("http://localhost:8791" + path, { waitUntil: "networkidle" });
  // island is client:load — wait for React to attach
  await page.waitForTimeout(1200);

  const before = await page.textContent("#island-shop");
  await page.click("#island button");
  await page.waitForTimeout(200);
  const btn = await page.textContent("#island button");
  const after = await page.textContent("#island-shop");
  const clientLocale = await page.getAttribute("#island", "data-locale");

  const bad = msgs.filter(m =>
    /hydrat|did not match|mismatch|Warning|Error/i.test(m.text) || m.type === "pageerror" || m.type === "error");

  const ok = clientLocale === expect.locale && after === expect.shop && btn.includes("clicked 1") && bad.length === 0;
  if (!ok) failures++;

  console.log(`\n### ${path}`);
  console.log(`  island data-locale after hydration : ${clientLocale}  (expected ${expect.locale})`);
  console.log(`  message text after hydration       : ${after}  (expected ${expect.shop})`);
  console.log(`  text unchanged by hydration        : ${before === after}`);
  console.log(`  React actually interactive         : ${btn.trim()}`);
  console.log(`  console errors/hydration warnings  : ${bad.length === 0 ? "none" : JSON.stringify(bad, null, 2)}`);
  console.log(`  => ${ok ? "PASS" : "FAIL"}`);
  await page.close();
}
await browser.close();
console.log(`\n${failures === 0 ? "✅ ALL PASS" : `❌ ${failures} FAILED`}`);
process.exit(failures ? 1 : 0);
