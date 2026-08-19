# zh-HK copy deck and CJK type

Type: task
Status: resolved
Blocked by: 05

## Question

Every chrome string on the site needs an English and a zh-HK value, and the pair has to be
typographically viable.

- **Enumerate every chrome string.** Nav (HOME / ABOUT / SHOP / CONTACT), footer (hours of
  operation, the day/time lines, address, phone, fax, WhatsApp, email, "Made by"), the homepage
  hero and shop blurb, the store notice ("Online shopping coming soon! ... give us a call ..."),
  the six category labels, search placeholder and button, pagination, 404 copy, and all `<title>` /
  meta description / Open Graph text. The final list depends on the copy the chosen design
  direction actually calls for.
- **Draft the zh-HK translations** for Dan's review. 三和文儀公司 is the established name from the
  shop's signage and is fixed. Everything else is drafted and reviewed — this is a HITL ticket and
  does not resolve without Dan's sign-off, particularly on the address and the hours, where Hong
  Kong convention matters more than literal translation.
- **Decide the CJK font stack.** Montserrat carries no Chinese. Pick the Chinese face and how it
  pairs with the Latin face at each level of the type scale, and check the weight and optical size
  actually match rather than merely coexisting. Traditional Chinese, Hong Kong variants — not
  Simplified, and not the Taiwan variant where they differ.
- **Decide the fallback**: what a visitor sees if a string has no zh-HK value yet.

Resolved when the message catalogue is populated in both locales and Dan has approved the Chinese.

## Answer

**Approved by Dan.** The catalogue is complete in both locales.

- Review deck: [`../copy/messages.md`](../copy/messages.md)
- Drop-in message files: [`../copy/en.json`](../copy/en.json) · [`../copy/zh-hk.json`](../copy/zh-hk.json)
- **91 messages**, no gaps, no placeholder mismatches between locales. Verified by compiling with
  Paraglide 2.24.1 and rendering every state in both languages — not by inspection.

Covers navigation, homepage, product grid, product detail, footer, address and hours, the
open/closed status states, every search state, 404, and the meta/OG strings.

### Rules this established, which later tickets must follow

- **Times and day names are messages, not values.** The first draft interpolated a formatted time
  and rendered `營業中 — 至7pm` — an English fragment stranded in a Chinese sentence. The shop has
  exactly three boundary times, so `time_0900` / `time_1730` / `time_1900` and `dayfull_*` are keys
  in their own right, composed into the status strings. **The word order differs between locales**
  (Chinese puts day and time before the verb), so this can never be string concatenation in
  component code. Nothing that is really language — dates, times, day names — may be formatted with
  `Intl` and dropped into a translated sentence.
- **CJK type**: `Noto Serif HK`, with `PingFang HK` leading the fallback (ticket 06). `:lang(zh-hk)`
  switches it, so Chinese inside an otherwise-Latin line is handled automatically.
- **The locale spelling is `zh-hk` throughout** — settled by the spike (ticket 11); the canonical
  `zh-HK` variant remains untested and is not used.
- **Fallback for an untranslated string**: none needed, the catalogue is complete. If one is added
  later, Paraglide falls back to `baseLocale` (English) rather than rendering the key.

### Content decision carried out here

**"over 10,000 products" is dropped from the meta description.** That number describes the physical
shop's stock, not the 348-product website, and read as an overclaim. The new description says what
is true: a family-run stationery and art supply shop on Stanley Street, trading since 1980.
