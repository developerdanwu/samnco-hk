import { readFileSync, readdirSync } from "node:fs";
const base = ".vercel/output/static";
const grab = (f, id) => (readFileSync(f, "utf8").match(new RegExp(`id="${id}"[^>]*>(.*?)<`, "s"))||[])[1]?.trim();
let en=0, zh=0, bad=[];
for (const d of readdirSync(`${base}/detail`)) {
  const f = `${base}/detail/${d}/index.html`;
  const shop = grab(f,"shop"), loc = grab(f,"loc");
  if (shop === "Sam and Company" && loc === "en") en++; else bad.push(`en ${d}: shop=${shop} loc=${loc}`);
}
for (const d of readdirSync(`${base}/zh-hk/detail`)) {
  const f = `${base}/zh-hk/detail/${d}/index.html`;
  const shop = grab(f,"shop"), loc = grab(f,"loc");
  if (shop === "三和文藝公司" && loc === "zh-hk") zh++; else bad.push(`zh ${d}: shop=${shop} loc=${loc}`);
}
console.log(`  en pages correct: ${en}/60   zh-hk pages correct: ${zh}/60`);
console.log(bad.length ? `  ❌ ${bad.length} WRONG:\n    ` + bad.slice(0,8).join("\n    ") : "  ✅ every page has the right locale");
process.exit(bad.length?1:0);
