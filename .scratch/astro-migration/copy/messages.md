# Copy deck — English / 繁體中文 (Hong Kong)

Ticket: `../issues/07-zh-hk-copy-deck.md` · Drafted for Dan's review.
Conventions: **Traditional Chinese, Hong Kong usage** — not Simplified, not Taiwan variants.
`公眾假期` (HK) not `國定假日`; `地下` for ground floor, not `一樓`; `士丹利街` is the street's
official Chinese name.

**三和文藝公司 is fixed** — it is the shop's real registered name and is not translated or adjusted.

Ready-to-use message files: [`en.json`](en.json) · [`zh-hk.json`](zh-hk.json)

---

## Navigation

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `nav_home` | Home | 主頁 | |
| `nav_about` | About | 關於本店 | |
| `nav_shop` | Shop | 產品 | not 商店 — nothing is sold online, so "products" is honest |
| `nav_visit` | Visit | 到訪 | |
| `lang_en` | English | English | shown in its own language, by convention |
| `lang_zh` | 繁體中文 | 繁體中文 | never a flag — a flag is a country, not a language |

## Homepage

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `home_hero` | Stationery and art supplies, since 1980. | 文具與美術用品，自一九八〇年。 | numerals spelled out reads more settled than 1980 |
| `home_intro` | A family-run shop on Stanley Street, in the middle of Central. Ten thousand things in a small room. | 中環士丹利街上的家庭小店。小小舖面，萬千用品。 | 小小舖面，萬千用品 is a deliberate parallel construction — closer in spirit than a literal rendering |
| `home_cta_shop` | Browse the shop | 瀏覽產品 | |
| `home_cta_find` | Find us | 到訪本店 | |
| `home_photo_caption` | The shop, 38 Stanley Street | 本店，士丹利街38號 | |
| `home_note_1_title` | Not a website that sells | 本網站不設網購 | |
| `home_note_1_body` | Nothing here is buyable online. Browse, then call, message, or walk in — it is faster and you will get better advice. | 網站上的貨品一律不設網購。看中了就致電、傳訊息，或直接到店 — 更快，也問得更清楚。 | |
| `home_note_2_title` | Everything, in one room | 一室之內，應有盡有 | |
| `home_note_2_body` | Office supplies, fine art materials, children's craft, and the seasonal things Hong Kong needs when it needs them. | 辦公文具、美術用品、兒童手工，以及香港人時節所需的各樣用品。 | |
| `home_note_3_title` | Ask for what you cannot see | 貨架以外，歡迎查詢 | |
| `home_note_3_body` | The shop holds far more than the shelves show. If it is not out, ask — it is probably behind the counter. | 店內存貨遠多於架上所見。找不到的話請開口問 — 多數就在櫃檯後面。 | |

## Shop / product grid

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `shop_title` | The shop | 產品一覽 | |
| `shop_intro` | 348 things we happen to have photographed. Nothing is buyable online — call, WhatsApp, or come in. | 這裡是我們拍過照的 348 件貨品。本網站不設網購 — 歡迎致電、WhatsApp 或親臨本店。 | count is interpolated live, not hardcoded |
| `shop_search_placeholder` | Search 348 products | 搜尋 348 件貨品 | |
| `cat_all` | All | 全部 | |
| `cat_office` | Office stationery | 辦公文具 | |
| `cat_seasonal` | Seasonal | 節慶用品 | "festive goods" — the stock is Lunar New Year, Mother's Day; 時令 would read agricultural |
| `cat_art` | Art supplies | 美術用品 | |
| `cat_lifestyle` | Lifestyle | 生活用品 | |
| `cat_children` | Children | 兒童用品 | |
| `pagination_next` | Next | 下一頁 | |
| `pagination_prev` | Previous | 上一頁 | |

## Product detail

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `detail_availability` | In stock on the shelf. We do not sell online — message us and we will put it aside for the day. | 現有存貨。本店不設網購 — 傳個訊息給我們，可代為留起當日。 | |
| `detail_ask` | Ask about this | 查詢此貨品 | |
| `detail_or_visit` | Or come in | 或親臨本店 | |
| `detail_more` | More in the shop | 更多產品 | |
| `detail_no_price` | Ask in store | 店內查詢 | shown where a product has no price — which is 94% of them |

## Footer

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `footer_shop` | Shop | 產品 | |
| `footer_pages` | Pages | 網頁 | |
| `footer_all_products` | All products | 全部產品 | |
| `footer_about` | About the shop | 關於本店 | |
| `footer_visit` | Visit us | 到訪本店 | |
| `footer_search` | Search products | 搜尋產品 | |
| `footer_ask` | Ask us | 聯絡我們 | |
| `footer_hours` | Opening hours | 營業時間 | |
| `footer_getting_here` | Getting here | 交通 | |
| `footer_directions` | Central MTR exit D2, two minutes up the street. | 港鐵中環站 D2 出口，沿街步行約兩分鐘。 | |
| `footer_maps` | Open in Maps | 在地圖中開啟 | |
| `footer_tagline` | Stationery and art supplies on Stanley Street since 1980 | 士丹利街上的文具與美術用品店，自一九八〇年 | |
| `footer_rights` | © 2026 Sam & Company | © 2026 三和文藝公司 | |
| `label_phone` | Phone | 電話 | |
| `label_fax` | Fax | 傳真 | |
| `label_email` | Email | 電郵 | |
| `label_whatsapp` | WhatsApp | WhatsApp | kept in Latin — nobody writes it in Chinese |

## Address and hours

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `address_line1` | G/F, 38 Stanley Street | 士丹利街38號地下 | HK ground floor is 地下, never 一樓 |
| `address_line2` | Central, Hong Kong | 香港中環 | |
| `address_full` | G/F, 38 Stanley Street, Central, Hong Kong | 香港中環士丹利街38號地下 | Chinese addresses run large → small, so the whole string reverses — **not** a line-by-line translation |
| `hours_weekday` | Mon – Fri&nbsp;&nbsp;9am – 7pm | 星期一至五　上午9時至晚上7時 | |
| `hours_saturday` | Sat&nbsp;&nbsp;9am – 5:30pm | 星期六　上午9時至下午5時30分 | |
| `hours_sunday` | Sunday | 星期日 | |
| `hours_closed` | Closed | 休息 | |
| `hours_ph` | Closed on Sundays and public holidays | 星期日及公眾假期休息 | 公眾假期 is the HK term |
| `day_mon`…`day_sun` | Mon…Sun | 一 / 二 / 三 / 四 / 五 / 六 / 日 | single characters for the seven-day footer strip; 星期 prefix would not fit |

## Open / closed status (ticket 16)

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `status_open_until` | Open now — until 7pm | 營業中 — 至晚上7時 | |
| `status_closing_soon` | Closing soon — 7pm | 即將關門 — 晚上7時 | only if that state is kept |
| `status_closed_opens` | Closed — opens {time} {day} | 休息中 — {day}{time}開店 | word order differs: Chinese puts day+time before the verb |
| `status_closed_ph` | Closed today — public holiday | 今日休息 — 公眾假期 | |
| `status_today_is` | Today is {day} — open until {time} | 今日{day} — 營業至{time} | |
| `time_0900` | 9am | 上午9時 | **times are messages, not formatted numbers** — see below |
| `time_1730` | 5:30pm | 下午5時30分 | |
| `time_1900` | 7pm | 晚上7時 | |
| `dayfull_mon`…`sun` | Monday…Sunday | 星期一…星期日 | full names, distinct from the single-character footer strip |
| `day_tomorrow` | tomorrow | 明日 | |
| `status_unknown` | Check our hours below | 請參閱下列營業時間 | the no-JavaScript and stale-holiday-list fallback |

## Search states (ticket 09)

| key | English | 繁體中文 |
| --- | --- | --- |
| `search_idle` | Search products | 搜尋產品 |
| `search_loading` | Searching… | 搜尋中… |
| `search_none` | Nothing matched "{query}". Try a shorter word, or ask us. | 找不到「{query}」。可試試簡短一點的字詞，或直接問我們。 |
| `search_error` | Search is not working just now. Please call us on +852 2523 0338. | 搜尋暫時無法使用。請致電 +852 2523 0338。 |
| `search_results` | {count} products | {count} 件貨品 |

## Errors and meta

| key | English | 繁體中文 | note |
| --- | --- | --- | --- |
| `404_title` | We cannot find that page | 找不到此頁 | |
| `404_body` | The page may have moved. Try the shop, or ask us. | 該頁可能已經移除。可到產品頁看看，或直接問我們。 | |
| `meta_title_home` | Sam and Company — Stationery and Art Supplies in Central, Hong Kong | 三和文藝公司 — 香港中環文具及美術用品店 | |
| `meta_desc` | A family-run stationery and art supply shop on Stanley Street, Central, Hong Kong. Trading since 1980. | 位於香港中環士丹利街的家庭式文具及美術用品店，自一九八〇年營業至今。 | the current meta claims "over 10,000 products" — that is the physical shop, not the site, and is dropped |

---

## A bug the runtime check caught — worth not repeating

The first draft interpolated a pre-formatted time: `status_open_until` with `{time}` receiving
`"7pm"`. In English that is fine. In Chinese it renders **`營業中 — 至7pm`** — an English fragment
stranded in a Chinese sentence.

**Times and day names must be messages, not values.** The shop has exactly three boundary times
(09:00, 17:30, 19:00), so `time_0900` / `time_1730` / `time_1900` and `dayfull_*` are message keys
in their own right, and the status string composes them:

```js
m.status_open_until({ time: m.time_1900() })
//  en    → Open now — until 7pm
//  zh-hk → 營業中 — 至晚上7時
m.status_closed_opens({ time: m.time_0900(), day: m.dayfull_mon() })
//  en    → Closed — opens 9am Monday
//  zh-hk → 休息中 — 星期一上午9時開店
```

Note the **word order differs** — Chinese puts day and time before the verb — which is exactly why
this cannot be done by string concatenation in component code. The same rule applies to anything
else that looks like a value but is really language: never `Intl.DateTimeFormat` output dropped into
a translated sentence.

Verified by compiling the catalogue with Paraglide 2.24.1 and rendering every status state in both
locales.

## Where Dan's judgement is actually needed

Everything above is a draft. Five that are **not** mechanical and want a native HK eye:

1. **`home_intro` — 小小舖面，萬千用品.** A deliberate parallel construction rather than a literal
   rendering of "ten thousand things in a small room". It either lands as warm or as trying too hard.
2. **`cat_seasonal` — 節慶用品 vs 時令產品.** Chosen 節慶 (festive) because the actual stock is
   Lunar New Year decorations and Mother's Day cards. 時令 would read as produce.
3. **`nav_shop` — 產品 rather than 商店.** "Shop" implies buying, which this site cannot do.
4. **Register throughout.** The English is plain and slightly dry. The Chinese aims to match rather
   than becoming formal 書面語 — e.g. 找不到的話請開口問 over a stiffer construction. Tell me if it
   should be more formal for an established shop.
5. **`address_full`.** The Chinese reverses to large→small, so it is a different string, not a
   translation of the English line order. Worth confirming the building number placement reads right.
