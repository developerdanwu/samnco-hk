# Design direction prototype

Type: prototype
Status: resolved
Blocked by: —

## Question

What should the redesigned site actually look like? Dan chose to react to concrete directions
rather than specify adjectives up front, and named Claude Design as the tool.

Produce **2–3 distinct directions** on a Claude Design canvas covering the three screens that carry
the site: **home** (hero, the shop blurb, discount items, find-us with the map), **product grid**
(category filter, search, the product card), and **product detail** (image gallery, product info).

Constraints the directions must respect:

- Brand equity is kept: the logo, "since 1980", 三和文儀公司, and the existing palette as a starting
  point — coral `#e07d78`, cream `#f7e1d3`, warm charcoal `#473D3C`. The coral is currently used as
  a background; pulling it back to an accent is worth testing in at least one direction.
- The brief is **editorial and quiet** — a 45-year-old family stationery and art shop in Central,
  not a startup and not a marketplace. Whether that reading is right is exactly what Dan is
  reacting to; a direction that deliberately challenges it is welcome.
- **Hard constraints from the content audit (ticket 02) — these are measured, not assumed:**
  - **Every product has exactly one image.** Never two. Any design premised on a gallery, a hover
    alternate, or multiple angles is undeliverable.
  - **Only 22 of 348 products (6.3%) have a price.** A card with no price is the *normal* case, not
    the edge case. A design that leans on price as a visual anchor will look broken on 94% of the
    catalogue.
  - **`category2` is null on 301 of 348 (86%)** and is being retired (ticket 14). Do not design a
    slot for it.
  - Category sizes are lopsided: `children` has 6 products and `lifestyle` 10, against hundreds
    elsewhere. A category landing that needs a full grid to look right will look broken on those two.
- **The product card is the hardest problem, and the audit makes it harder.** Today it stacks
  `title`, `category`, `category2` and `price` as four undifferentiated headings — of which
  `category2` is empty 86% of the time and `price` is empty 94% of the time. So today's card is, in
  practice, *a title, a category, and two blank headings*. The directions must resolve what a
  visitor actually needs to see given nothing is purchasable online and there is no price to show.
- The design leads the component library, not the reverse. shadcn/Base UI supplies behaviour; these
  directions define palette, type scale, spacing and the card, and Tailwind tokens are configured
  to match.
- Type must accommodate **Chinese alongside Latin**. Montserrat has no CJK coverage, so any
  direction needs a plausible answer for how zh-HK text sits next to English — settled properly in
  the zh-HK copy ticket, but it cannot be an afterthought here.

Resolved when Dan has picked a direction (or a hybrid), and the choice is recorded with the palette,
type scale and spacing that follow from it. Link the canvas from the answer.

## Answer

**Direction chosen: "Ledger" — quiet, editorial, serif.** Canvas:
https://claude.ai/code/artifact/3577f29c-d0bc-4737-acfb-12b3e166365e
(Archive and Market are kept on the canvas below it for reference, and can be cleared away.)

Three directions were drafted across home, grid and detail, using **real products and real
photography** from the Contentful space so the card was judged against the actual catalogue rather
than a flattering mock-up. Dan picked Ledger, then asked for two changes, both applied.

### What Ledger is

- **Ground** `#FBF7F2` (warm off-white), **panel/tile** `#F7E1D3` (the existing cream), **text**
  `#473D3C`, **muted** `#8E7B74`.
- **Coral is demoted to an accent** — a hairline under the active nav item and the link colour
  `#B4564F` (a darkened coral that passes contrast on cream, where `#e07d78` does not). The product
  photograph is the only saturated thing on the page.
- **Type**: `Newsreader` for display and product titles, `Karla` for body and UI, `Noto Serif HK`
  for Chinese. Category labels are 10px uppercase at 0.2em tracking.
- **Product card**: square cream tile, image `object-fit: contain` at 82% with `mix-blend-mode:
  multiply` so the catalogue shots' white backgrounds disappear into the tile; serif title; category
  in small caps. **No price is displayed at all** — with 94% of products missing one, showing it
  only where present would make the grid look broken rather than informative.
- **Grid** is 4 across. Category filters carry counts, which turns the lopsided categories
  (`children` 6, `lifestyle` 10) into information rather than an embarrassment.
- **Detail** pairs one large image with a contact block — WhatsApp, phone, email, address — since
  there is nothing to add to a cart. No gallery: every product has exactly one image.

### The two changes Dan asked for

1. **The homepage leads with a photograph of the shop**, not a product and not the shopkeeper. Using
   `public/static/images/banner-*.jpg` — customers at the counter, lanterns overhead. Rationale
   worth keeping: a product shot argues for a transaction the site cannot complete, while a
   photograph of the shop argues for the visit, which is the only conversion available. It also
   resolves the awkwardness of a homepage with no products on it — the homepage is not a product
   surface at all.
2. **The locale switcher is a dropdown**, not inline `EN · 中文` text. Shown open on the homepage
   artboard, closed elsewhere. Options read "English" and "繁體中文", with a check on the active one.

### Consequences for other tickets

- **Ticket 06** (tokens) inherits the palette, the type pairing and the 10px/0.2em label treatment
  above; those become the Tailwind theme.
- **Ticket 07** (zh-HK copy) inherits `Noto Serif HK` paired with Newsreader as the CJK answer, and
  now also needs the two switcher strings ("English" / "繁體中文").
- **Ticket 15** (images) — the three shop photographs are **local assets and Astro's job**, not
  Cloudinary's. They should move into `src/assets/`. Note the homepage hero is now the LCP element.
- The old `about-img` portrait is unused on the homepage but remains the natural About-page image.

### Resolved: the shop's framing

Raised because the catalogue is **49% office stationery** (171 of 348) against 77 art supplies, and
it was worth checking whether the redesign should shift emphasis accordingly.

**Dan's answer: it is a stationery and art supply store.** The framing stands, and no copy changes
follow — the drafted copy already names both with **stationery first**, which matches the split:
`home_hero` "Stationery and art supplies, since 1980", `meta_title_home`, and `footer_tagline` all
lead with stationery.

*The original flag slightly overstated the problem — the copy was not mis-framed, and the only real
question was whether to push emphasis further toward office supplies. It should not be.*

## Amendment — variant B adopted

After the direction was chosen, three further changes were made and approved. They are now applied
across all seven Ledger artboards (3 desktop, 4 mobile) and are canonical.

1. **三和文儀公司 leads the header**, set at 27px desktop / 19px mobile in Noto Serif HK 600. The
   English "Sam & Company · since 1980" is demoted to an 11px letterspaced line beneath. For a
   Central shop whose customers are mostly local, the previous hierarchy was backwards.
   *Caveat: this approximates 北魏楷書 (Bei Wei Kai), Hong Kong's traditional shopfront calligraphy,
   but is not it — there is no such face on Google Fonts. A genuine one is a licensed font, or a
   photograph of the shop's actual signage, which would be better than either.*
2. **The accent is `#CC0000`, the logo red.** The coral `#e07d78` is retired — see ticket 06; it was
   a 2021 website invention, not the company's colour. Links are `#CC0000`, hover `#A30000`, and the
   active nav item takes a 2px `#CC0000` rule.
3. **The company logo is in the design** (38px desktop, 30px mobile). It was absent from the first
   round of mockups — an omission, not a decision.

### Mobile, added in the same pass

Four artboards at 390px: Home, Grid, Detail, and Menu. Decisions worth keeping: **two products
across, not one** (a single column makes 348 products an endless scroll); **category filters scroll
horizontally** rather than wrapping to three rows; **every tap target is ≥44px**; **WhatsApp is
promoted to a primary button** on mobile, since it is how people message a Hong Kong shop and the
only action a phone can complete instantly; the **hero photo sits below the headline** so the first
paint is text, not a large image on mobile data.

### New: open/closed status — a deliberate scope addition

Approved by Dan. A status chip — "Open now — until 7pm" — on the desktop home, mobile home, and in
the mobile menu. Prompted by [Monte](https://mobbin.com/sites/sections/2b8ad772-2f97-44a9-bea1-29d14f646b83)
on Mobbin. It is the highest-value thing on the page for the site's most common visitor: someone in
Central deciding whether it is worth walking over. **This is functionality the current site does not
have**, so it is an explicit, approved addition to "parity". Specified in ticket 16.

Also noted from the Mobbin pass: most language switchers use **flags**. Do not — a flag denotes a
country, not a language, and for zh-HK that is a choice with no upside. Text labels ("English" /
"繁體中文") are correct and are what the design uses.

## Amendment 2 — the footer

The first footer was three columns of plain text and was rightly called sparse. Four variants were
drawn (Directory, Wordmark, Map, Sitemap); **Sitemap was chosen**, desktop and mobile.

**Diagnosis worth keeping: the footer was not just visually thin, it was dropping information the
site already has.** The original omitted the **fax number** (which is on the current live site), the
**category links**, and the **MTR exit**. All four variants restored them.

### Footer D — Sitemap, as adopted

- **Navigation row**: brand with the open/closed chip and address · Shop, listing all five
  categories with their counts · Pages · Ask us (WhatsApp, phone, fax, email).
- **Information band**: a **seven-day hours strip** with today's column highlighted, beside a
  Getting here block — MTR exit D2 — with "Open in Maps" and "WhatsApp us".
- **Wordmark band**: 三和文儀公司 at 118px in pale cream. This is where the tradition argument pays
  off — at that size the letterforms actually read.
- **Bottom strip**: the shop's one-line description and `© 2026 Sam & Company`.

**Mobile (390px)** stacks rather than collapsing into an accordion — a footer accordion hides the
information people came for and spends JavaScript to do it. Hours compress from the seven-day strip
to three rows (Mon–Fri / Sat / Sun); every row is a 44px tap target; WhatsApp becomes a full-width
`#CC0000` button; the wordmark drops from 118px to 52px.

### Two things deliberately removed

- **"Made by Dan Wu"** — carried over from the current site, dropped from every variant at Dan's
  request. Replaced with `© 2026 Sam & Company`.
- **A separate 繁體中文 column**, and then the footer language switch that briefly replaced it.
  Reasoning worth recording, because the first instinct was wrong: the Chinese site is **not a
  section** of the English one, it is the same four pages in another language. A column listing
  主頁 / 關於本店 / 商店 implies separate destinations, and on the Chinese version of the page the
  whole footer is already Chinese, so it has nothing coherent to mirror. The SEO argument for the
  links was weak — **`hreflang` tags in `<head>` are the actual mechanism** (ticket 08), not footer
  links. The locale control lives in the nav only.
