# Layout shell: header, footer, status

Type: task
Status: resolved
Blocked by: 17

## Question

The chrome every page shares, per ticket 05.

**Header**: logo (38px desktop / 30px mobile), 三和文儀公司 leading with the English name beneath,
nav with a 2px `#CC0000` rule on the active item, locale **dropdown** (never flags), mobile burger
opening the full-screen menu.

**Footer**: the sitemap footer — navigation columns, seven-day hours strip with today highlighted,
getting-here, 118px wordmark band (52px mobile). No credit line, no language section.

**Status chip** (ticket 16): plain module script, not a React island. Build-time fetch of both
`1823.gov.hk` feeds — **strip the UTF-8 BOM** — with a checked-in snapshot fallback. Prerendered
HTML carries the hours summary, never a computed state. Fails to "check our hours" past the list.

## Answer

**Done and browser-verified.** Header, footer and the open/closed status are live in both locales.

### Verified in a real browser

| check | en | zh-hk |
| --- | --- | --- |
| status served **before JS** | "Mon–Fri 9am–7pm · Sat 9am–5:30pm" | "星期一至五 上午9時至晚上7時 · …" |
| status **after JS** | "Open now — until 7pm" | "營業中 — 至晚上7時" |
| locale dropdown | English / 繁體中文 | same |
| mobile menu | Home / About / Shop / Visit | 主頁 / 關於本店 / 產品 / 到訪 |
| hydration or console problems | none | none |

**Every status state was tested with a mocked clock, not just the happy path:**

| moment | result |
| --- | --- |
| Wed 10:00 HK | Open now — until 7pm |
| Wed 18:45 HK | Closing soon — 7pm |
| Wed 21:00 HK | Closed — opens 9am tomorrow |
| Sun 12:00 HK | Closed — opens 9am tomorrow |
| **eve of National Day** | **Closed — opens 9am Friday** — correctly skips the Thursday holiday |
| National Day | Closed today — National Day / 今日休息 — 國慶日 |
| **past the holiday data** | **Check our hours below** — fails safe, does not assume open |

The National Day eve case is the one worth having: next-opening walks forward skipping **both**
Sundays and holidays, so it lands on Friday rather than the holiday Thursday.

### Holiday data

`scripts/fetch-holidays.mjs` runs as `prebuild`. **51 holidays through 2027-12-27**, both languages,
from the government feed — **BOM stripped**, as it would otherwise fail `JSON.parse`. A fetch failure
keeps the committed snapshot and warns loudly rather than breaking the deploy; only a failure with
*no* snapshot exits non-zero.

### "Visit" is a footer anchor, not a page

The nav initially linked `/visit`, which does not exist. Corrected to `#visit` targeting the
footer's getting-here block — **which is exactly what the original site did** (its CONTACT link was
`#footer`). Inventing a Visit page would be scope the migration did not ask for.

### ⚠ Measured JS contradicts ticket 12's stated outcome

**118.6 KB gzip ships on every page:**

| chunk | gzip |
| --- | --- |
| React runtime | 55.1 KB |
| `Nav` island (locale dropdown + mobile sheet) | 55.6 KB |
| react-dom | 4.0 KB |
| Paraglide runtime | 1.3 KB |
| **status script** | **2.3 KB** |

Ticket 12 recorded "home, about and 404 have no interactive element and should ship zero JS". **That
is not achievable with the nav as a React island** — the header is on every page, so every page pays
118.6 KB. The contradiction was mine, written before the nav existed.

Two honest options, and this is Dan's call:

- **(a) Leave it.** 118.6 KB everywhere. One mental model, full shadcn vocabulary.
- **(b) Make the nav zero-JS** — the locale dropdown and mobile menu both become `<details>`
  disclosures, which is entirely adequate for what they do. Then **only the shop page ships React**
  (for search), and home, about, detail and 404 ship **2.3 KB** — the status script alone. **A
  116 KB saving on four of the five page types.**

Implemented as (a), per ticket 12's decision. Flagged with the real number because that number was
not available when the decision was made. Flipping it later touches one component.
