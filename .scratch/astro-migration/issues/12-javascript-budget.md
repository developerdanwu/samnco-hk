# Decide the JavaScript budget

Type: grilling
Status: resolved
Blocked by: —

## Question

The stack research measured what React islands actually cost on this site: **~60 KB gzip is the
floor on any page carrying an island, and ~138 KB gzip is the full island set** (Base UI shares
chunks, so the deltas do not simply add up).

This is worth putting back to Dan because the numbers were not available when the stack was chosen.
Two of the four reasons for migrating were "the site looks dated" and "it is painful to maintain" —
but Astro's headline benefit is shipping almost no JavaScript, and 138 KB on a five-page brochure
site spends most of it. The choice of React was deliberate and made twice; this ticket exists to
re-decide it **with the measurement in hand**, not to reopen it on principle.

Three positions:

- **(a) React everywhere it is convenient.** Mobile nav, gallery and search are all React islands.
  Simplest to build and maintain, one mental model, full shadcn/Base UI vocabulary. ~138 KB gzip.
- **(b) React confined to search.** The mobile nav becomes a zero-JS CSS disclosure and the gallery
  becomes CSS `scroll-snap` — both are genuinely solvable without a framework. React and react-query
  load only on the shop page, where the debounced Contentful search actually needs them. Home,
  about, detail and 404 ship **no JavaScript at all**.
- **(c) No React.** Search becomes a progressively-enhanced form. Cheapest to ship, most to write by
  hand, and abandons the shadcn/Base UI component vocabulary entirely.

**Measured on this exact stack by the spike (ticket 11), superseding the estimates above:** a page
carrying one React island with a shadcn/Base UI Button + Dialog costs **90.6 KB gzip** (React
runtime 55.1 + island 31.4 + react-dom 4.0). **A page with no island ships zero JavaScript — not a
single `<script src>`.** So the choice below is not "how much JS does the site ship" but "how many
of the five page types pay 90 KB".

Two audit findings also shrink option (a)'s value: **every product has exactly one image**, so the
detail-page carousel has nothing to carousel — dropping it removes Embla and one island outright.
And the mobile nav is a disclosure, which is the cheapest possible thing to do without a framework.
That leaves search as the only island with a real claim on React.

Inputs for the decision:

- `react-query` costs ~9.6 KB gzip and serves exactly one endpoint. Under (b) it is confined to the
  shop page; under (c) it disappears. It was an explicit charting choice, so it is Dan's to keep.
- Under (b), the shop page still gets the full shadcn combobox with its async support — the piece
  where the component library earns its cost. The savings come from the nav and gallery, which are
  the two places a framework buys least.
- The audience is walk-in customers in Hong Kong looking up a shop's address, hours and stock,
  frequently on mobile data.

**Settle this before or alongside the design-direction prototype (ticket 05)**, so the design is not
committed to an interaction the budget then vetoes.

Resolved when the position is chosen and a per-page JS budget is written down that later build
tickets are measured against.

## Answer

**(a) React everywhere it is convenient.** Dan's call, made with the measured numbers in hand:
90.6 KB gzip on any page carrying an island, zero JS on pages without one.

Recorded rationale: one mental model and the full shadcn/Base UI vocabulary is worth ~90 KB on a
site Dan has to maintain alone. The maintainability half of "why modernise" was one of the two
stated drivers, and this serves it directly.

### What this actually means in practice

"Everywhere it is convenient" is narrower than it sounds, because the audit removed one island:

- **Mobile nav** — React island (shadcn `sheet`/`drawer` on Base UI).
- **Search** — React island with the Base UI combobox and React Query. This was always the one with
  a real claim.
- **Product gallery — does not exist.** Every product has exactly one image, so there is nothing to
  carousel. Embla is not needed and should not be installed. Confirmed in ticket 15.

So: **home, about and 404 have no interactive element and should ship zero JS.** Shop and detail
carry the nav island. There is no per-page budget to enforce beyond that — the rule is simply that a
page with no interaction gets no `client:*` directive.


## Measured after implementation (ticket 19)

**118.6 KB gzip on every page** — React 55.1 + Nav island 55.6 + react-dom 4.0 + Paraglide 1.3 +
status script 2.3.

**This contradicts the answer above**, which said home, about and 404 would ship zero JS. That is
impossible with the nav as a React island, since the header is on every page. The error was in this
ticket, written before the nav existed.

Option (b) is still available and now has a real price attached: making the nav two `<details>`
disclosures would confine React to the shop page and drop the other four page types to **2.3 KB** —
a 116 KB saving. **Dan chose (a), with the measured number in hand: the nav stays a React island and every page ships 118.6 KB gzip.** Recorded as a deliberate trade — one mental model and the full shadcn vocabulary, bought for 116 KB on four page types. Option (b) remains a one-component change if it is ever revisited.
