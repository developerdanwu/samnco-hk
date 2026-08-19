# Turn the chosen design direction into Tailwind theme tokens

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

The chosen direction has to become a token system the whole site is built from, or it will drift
back toward stock shadcn defaults — the exact failure mode the "behaviour primitives only" decision
exists to prevent.

- **The brand has two different reds, and one of them is not in the design system.** The company
  logo (`public/static/images/logo.png`, an "SC" monogram — a real company mark, not a site
  invention) is **`#CC0000`**: saturated, dark, unambiguous. The site's SCSS palette uses
  **`#e07d78`**: soft, pink-leaning, low chroma. They are far enough apart in chroma and lightness
  that placing them adjacent reads as a mistake rather than a pairing. **SETTLED — `#CC0000` governs** (ticket 05
  amendment, approved by Dan): the coral is retired, links are `#CC0000` / hover `#A30000`, and the
  active nav rule is 2px `#CC0000`. What remains open is the **cream**: `#f7e1d3` was derived as a
  tint of the retired coral and now sits slightly orange against a true red. Decide whether to
  re-derive the tile and panel creams from `#CC0000` or keep the existing warm cream deliberately.
  The original options, for the record:
  (a) `#CC0000` becomes the accent and the coral is retired or kept only as a tint — most
  defensible, since the logo is the company's actual mark and the shop photography is full of
  saturated reds that sit with it; (b) the coral stays as the site accent and the logo is allowed to
  be an island, which is common and legitimate; (c) reconcile, deriving the coral as an explicit
  tint of `#CC0000`. Note the Ledger direction already darkens the coral to `#B4564F` for link
  contrast — that darkened value sits closer to the logo red than the original coral does.
- What are the **colour tokens**, including the semantic layer shadcn components expect
  (background, foreground, muted, accent, border, ring) mapped onto 三和文藝's palette rather than
  shadcn's neutral greys?
- What is the **type scale**, and which families carry Latin and Chinese?
- What are the **spacing, radius and shadow** scales? shadcn's uniform small radii are a large part
  of why stock shadcn reads as a dashboard; this is where that is overridden.
- Is there a **dark mode**? The current site has none. Deciding "no" explicitly is a valid answer
  and saves work everywhere.
- How are tokens **expressed** — Tailwind v4's CSS-first `@theme` or a JS config? Depends on what
  the stack research found.

Resolved when a single tokens file exists that every component reads from, and a stock shadcn
component dropped into the page visibly belongs to this site.

## Answer

**Token file: [`../design-tokens/global.css`](../design-tokens/global.css)** — drop in as
`src/styles/global.css` after `shadcn init`. **Verified by compiling it** in the spike project
against real Tailwind 4.3.3 + shadcn + Base UI, not by inspection: the build passes and every token,
the semantic mapping, the `.eyebrow` utility and the CJK `:lang` rule are present in the emitted CSS.

### The finding that justified the ticket: three greys fail WCAG AA

Contrast was measured, not eyeballed, against the page ground `#FDF6F3`. **The approved mockups ship
three muted greys that fail AA for small text**, all used for 10px eyebrow labels and de-emphasised
lines:

| Value | Ratio | Used for | Verdict |
| --- | --- | --- | --- |
| `#9A8B85` | **3.07:1** | 10px eyebrow labels | fails |
| `#A2938D` | **2.90:1** | de-emphasised lines | fails |
| `#8E7B74` | **3.75:1** | muted body text | fails |
| `#E07D78` | **2.67:1** | the retired coral | fails |

The lightest legal text colour on this site is **`--color-paper-650` (`#816E67`, 4.51:1)** — derived
by solving for the most muted value that still clears 4.5:1. `paper-500` and `paper-600` stay in the
ramp for **borders, rules and icons only**.

**This means the canvas mockups are not pixel-authoritative on muted text.** The tokens are the
source of truth; anyone matching the artboards by eye will reintroduce the failing greys.

Two earlier claims were also checked rather than left as assertions, and both hold: **`#CC0000`
passes at 5.51:1**, and the retired coral genuinely failed.

### Decisions settled here

- **The cream is re-derived.** The old `#f7e1d3` was a tint of the retired coral, sitting at hue 68
  against a brand red at hue 29 — visibly a different family. The new neutral ramp holds **hue ~50,
  drifting warm to 32 as it darkens**, so shadows read warm rather than grey. It stays a warm cream
  by choice, but is no longer orange against a true red.
- **No dark mode.** Deliberate: a warm-paper aesthetic does not invert meaningfully, the current
  site has none, and it would double the token and QA surface of a five-page brochure site. The
  `dark` variant stays *declared* so shadcn components compile; no `.dark` block exists and the
  class is never applied.
- **`--radius: 0.125rem` (2px)**, against shadcn's 10px. This one value is most of what separates
  the site from looking like a dashboard; the rest of the radius scale derives from it.
- **`--primary` is ink (`paper-900`), not red.** Solid buttons are charcoal; red is reserved for
  links and the single WhatsApp call to action, so it keeps its force.
- **`--destructive` is aliased to the brand red.** Nothing on this site can be deleted or ordered,
  so rather than introduce a second unrelated red, a stray component still looks native.
- **Chinese is switched by `:lang(zh-hk)`, not a class**, so it follows the locale automatically —
  including Chinese inside an otherwise-Latin line. `PingFang HK` leads the fallback stack: it is
  the system face on every Mac and iPhone in Hong Kong.

### One trap worth knowing

Replacing shadcn's generated `global.css` wholesale **drops its `@theme inline` block**, and the
build then fails with *"Cannot apply unknown utility class `border-border`"*. That block maps
`--color-*` onto the bare semantic vars and is required. It is preserved in the file with a comment
saying so — this was hit for real during this ticket, not anticipated.
