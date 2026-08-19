# Open/closed status indicator

Type: grilling
Status: resolved
Blocked by: 07

## Question

Approved in ticket 05: a status chip reading "Open now — until 7pm" on the homepage and in the
mobile menu. It is the most useful element on the page for a visitor standing in Central, and it
needs no CMS field and no API — the hours are fixed. But it has more edge cases than its size
suggests, and a wrong answer is worse than none: telling someone the shop is open when it is closed
sends them on a pointless trip.

Known hours: **Mon–Fri 09:00–19:00, Sat 09:00–17:30, closed Sundays and public holidays.**

- **Where is it computed?** Pages are prerendered, so a build-time answer would be frozen at deploy
  and wrong within hours. It must be **computed in the browser** — which means it is one of the few
  things that cannot be static, and it must degrade to something sensible with JavaScript disabled
  (show the plain hours, never a stale "Open now").
- **Date library: not needed, and settled.** Dan asked whether date-fns or dayjs should do the
  formatting. **Computation** — is-open, next-opening, timezone — is ~15 lines of
  `Intl.DateTimeFormat(…, { timeZone: "Asia/Hong_Kong" }).formatToParts()` with **zero
  dependencies**; demonstrated working, including a process clock forced to `Europe/London`, the
  Saturday 17:30 boundary, and a holiday date. **Display** cannot use a library at all: `dayjs` can
  emit `晚上7時`, but the sentence reorders between locales (`Closed — opens 9am Monday` vs
  `休息中 — 星期一上午9時開店`), so the message owns the whole string and the time is passed in as
  another message (ticket 07). If a library is wanted anyway for readability, prefer **date-fns +
  `@date-fns/tz`** over dayjs — per-function tree-shaking, where dayjs needs the `utc` and
  `timezone` plugins together.
- **Whose clock?** It must resolve against **`Asia/Hong_Kong`**, not the visitor's locale — someone
  checking from London must see Hong Kong's status. Use an explicit IANA timezone, never the
  device's offset.
- **Public holidays are the hard part.** Hong Kong's gazetted holidays are the difference between
  correct and confidently wrong, and they move each year (Lunar New Year, Ching Ming, Tuen Ng,
  Mid-Autumn, Chung Yeung all follow the lunisolar calendar). Options: (a) a **static list checked
  into the repo**, simple and offline but stale after twelve months unless someone remembers;
  (b) the Hong Kong government's published **iCal feed** of statutory holidays, fetched at build
  time and baked in — accurate, still needs a rebuild each year, and adds a build dependency;
  (c) skip holidays and accept being wrong roughly 17 days a year. **Decide, and decide what happens
  when the list runs out** — falling back to "check our hours" is safer than assuming open.
- **What does it say when closed?** "Closed" alone is unhelpful; "Closed — opens 9am tomorrow"
  requires computing the next opening, which must skip Sundays and holidays. Also decide the
  wording for the last hour ("Closing soon"?) and whether that is worth the complexity.
- **Chinese strings.** Every state needs a zh-HK equivalent — feeds ticket 07, hence the block.
- **Accessibility.** The green dot must not be the only signal; the text has to carry the state on
  its own, and the chip should be announced sensibly rather than read as decoration.

Resolved when the holiday source is chosen, the state machine (open / closing soon / closed / next
opening) is written down in both languages, and the no-JavaScript fallback is agreed.

## Answer

### The holiday problem is solved — the Hong Kong government publishes the list

`https://www.1823.gov.hk/common/ical/en.json` — **verified live, HTTP 200, no API key, no
registration.** Calendar name: *"Hong Kong Public Holidays"*, which is 公眾假期 — precisely what the
shop closes on, and the right list rather than the shorter statutory 勞工假期.

- **51 events covering 2025, 2026 and 2027** — 17 per year, so roughly 16–24 months of runway from
  any given build.
- **A Traditional Chinese feed exists at the same path**: `.../ical/tc.json`, with 中秋節翌日,
  國慶日, 重陽節翌日 — matching our two locales exactly.
- Dates arrive as `dtstart: ["20260926", {"value":"DATE"}]`.
- **Gotcha, hit for real: the JSON is served with a UTF-8 BOM** and fails a plain `JSON.parse` /
  `json.load`. Strip it (`utf-8-sig`, or `.replace(/^﻿/, '')`) or the build breaks on a file
  that looks perfectly valid.
- Also available as `.ics` if a calendar parser is ever preferred.

**Fetch both feeds at build time and bake the dates into the bundle.** No runtime fetch: it would
add a third-party dependency to a page load, and the data changes once a year.

Because the feed carries names in both languages, the closed state can **name the holiday** rather
than saying "public holiday" — new message `status_closed_ph_named`: "Closed today — The day
following Chung Yeung Festival" / 今日休息 — 重陽節翌日.

### Two failure modes, both handled by failing safe

1. **The list runs out.** If the site is not rebuilt for ~18 months, `today` passes the last known
   holiday. **Do not assume open.** Past the last known date the component renders
   `status_unknown` — "Check our hours below" — and the footer's hours table carries the answer.
   Being unhelpful is recoverable; sending someone to a closed shop is not.
2. **The fetch fails at build time.** A network flake must not break a deploy. **Check a snapshot of
   the parsed dates into the repo** and use it if the fetch fails, with a loud build warning. The
   snapshot is refreshed whenever the fetch succeeds.

### Timezone: no library needed

Demonstrated working with **zero dependencies** (see the note recorded earlier in this ticket):
`Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", weekday, hour, minute, … })
.formatToParts()` gives Hong Kong's wall clock regardless of the visitor's device. Verified with the
process clock forced to `Europe/London`, across the Saturday 17:30 boundary and a holiday date.

### State machine

Hours: **Mon–Fri 09:00–19:00, Sat 09:00–17:30, Sun closed.**

| state | condition | message |
| --- | --- | --- |
| `closed_ph` | today ∈ holiday set | `status_closed_ph_named` — names the holiday |
| `closed` | Sunday, or outside hours | `status_closed_opens` — with the **next** opening |
| `closing_soon` | within 60 min of close | `status_closing_soon` |
| `open` | within hours | `status_open_until` |
| `unknown` | past the holiday list, or no JavaScript | `status_unknown` |

**Next opening** walks forward from today skipping Sundays *and* holidays, so the Sunday before a
Monday holiday correctly says Tuesday. `day_tomorrow` is used when the next opening is tomorrow,
otherwise the full weekday name — and per ticket 07 both the day and the time are passed in **as
messages**, because the two locales order them differently.

### No JavaScript, and no flash of wrong state

**The prerendered HTML must not contain a computed state** — it would be frozen at deploy and wrong
within hours. It ships with `status_hours_summary` ("Mon–Fri 9am–7pm · Sat 9am–5:30pm") and a
neutral dot; the script then replaces it with the live state. That is honest before JavaScript runs,
useful if it never does, and never stale. The chip has a fixed height so the swap causes no layout
shift.

### Implementation note

**A plain module script, not a React island.** It is a DOM text swap with no state, roughly 40 lines
plus the baked date array, and it works even if React fails to hydrate. This is consistent with
ticket 12 — "React where it is convenient" — because here vanilla genuinely is.

### Accessibility

The green dot is **decorative and `aria-hidden`**; the text carries the state on its own, so it is
never colour-only. The chip renders as ordinary text, not a live region — it is computed once on
load, so announcing it as an update would be wrong.
