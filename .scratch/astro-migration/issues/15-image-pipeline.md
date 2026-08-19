# Decide the image pipeline

Type: grilling
Status: resolved
Blocked by: 05

## Question

The content audit settled the main question and opened smaller ones.

**Established:** every product has **exactly one image** (min = max = 1). Images are Cloudinary URLs
stored on the entry — there are **zero Contentful Assets**. Stored URLs carry only `f_auto,q_auto`
(237) or `f_auto/q_auto` (111), with **no width transform**. Measured: a grid thumbnail downloads at
**74 KB** as-is; adding `w_400` brings it to **31 KB**.

**Therefore: resize in Cloudinary, not Astro.** Astro's optimiser would need to download and
re-encode **278 MB of source PNGs** at build time for no benefit, on every deploy. Inserting
transform segments into the Cloudinary URL is nearly free and cuts grid weight by ~58%.

What still needs deciding:

- **The transform set per context** — grid thumbnail, detail hero, homepage feature. Which widths,
  and the `srcset` breakpoints for each. Depends on the layout ticket 05 settles.
- **How the transform is applied.** The stored URLs are inconsistent (`f_auto,q_auto` vs
  `f_auto/q_auto`), so a helper must parse and rewrite rather than string-concatenate. Where does it
  live, and how does it fail if a URL does not match either shape?
- **The detail-page gallery.** The current carousel loops `image[1:]`, which is **dead on all 348
  products** — there is never a second image. Does the redesign drop the gallery entirely (and with
  it the Embla dependency), or keep a single-image presentation that could grow later? Dropping it
  is the honest read of the data and removes a component from the JS budget.
- **The local images** — hero banner, map banner, about. These are real files in `public/static/` with
  hand-rolled `srcset` at 500/800/2500. **These are Astro's job**, not Cloudinary's, and should move
  into `src/assets/` to get content-hashed optimisation.
- **Missing-image handling.** Confirm the count from the audit and decide what the card renders —
  today `get_image` swallows the error and emits a broken `<img>`.
- **Lazy loading and LCP.** Which image is the LCP element on each template, and which get
  `loading="lazy"`.

Resolved when the transform strategy, the helper's location, and the gallery's fate are decided.

## Answer

**Resize in Cloudinary. This is the single biggest performance win in the migration — bigger than
changing framework.** Measured across five real product images:

| | mean per image | one grid page (36 products) |
| --- | --- | --- |
| **as stored today** | 171.4 KB | **6.03 MB** |
| `w_400` | 15.8 KB | **0.55 MB** — 91% less |
| `w_800` (2×) | 49.6 KB | 1.75 MB |

The current site ships **6 MB of images per shop page** because the stored URLs carry no width
transform at all. Adding one is a string edit.

### Corrections to the audit

- The two stored shapes are **`/upload/f_auto,q_auto/` (237)** and **`/upload/f_auto/` (111)** — the
  second has no `q_auto`, rather than being a slash-separated variant as recorded in ticket 02.
- **That inconsistency turns out to be cosmetic.** Both shapes deliver **byte-identical** responses
  (155,120 bytes for the same image), so Cloudinary is applying automatic quality regardless. The
  111 entries are not being served worse. The helper normalises them anyway, but nothing was broken.
- `q_auto:eco` was tested and gives **no further saving** at `w_400` (10,818 bytes either way). Not
  worth the quality risk.

### Confirmed against all 348 entries

- **0 entries are missing an image.** The template must still handle null defensively — Contentful
  is editable and this is a boundary — but no placeholder design is needed today.
- **0 entries have more than one image.** So the **gallery is dropped**: no carousel, no Embla, one
  island fewer. This is now settled rather than pending.
- All 348 source files are **PNG**.

### Transform sets

Rendered widths, from the Ledger layouts: grid card ≈ 250 px desktop / 175 px mobile; detail hero
≈ 550 px desktop / 350 px mobile.

| context | `srcset` | `sizes` |
| --- | --- | --- |
| grid card | `w_200` (3.8 KB), `w_400` (10.6 KB), `w_600` (22.6 KB) | `(min-width: 900px) 250px, 45vw` |
| detail hero | `w_400`, `w_800`, `w_1200` | `(min-width: 900px) 550px, 92vw` |

Always with **`c_limit`**, which never upscales past the source. The homepage needs no product
transform — it leads with shop photography now (ticket 05).

### The helper

Stored URLs are inconsistent, so this is a **parse-and-replace, never a concatenation**:

```
/upload/<existing segment>/  →  /upload/f_auto,q_auto,w_<n>,c_limit/
```

Appending instead of replacing yields `/upload/f_auto/f_auto,q_auto,w_400/`, which Cloudinary either
rejects or silently mis-renders. If a URL matches neither shape — a hand-pasted link, a future
editor mistake — the helper returns it **unchanged** rather than guessing, and the page still works
at full size. It never throws.

### Local images are Astro's job, not Cloudinary's

The hero, map and about photographs are real files in `public/static/images/` with hand-rolled
`srcset` at 500/800/2500. They move to **`src/assets/`** so Astro's `<Image>` hashes and optimises
them at build. There are **zero Contentful Assets**, so this is the only place Astro's optimiser is
used — pointing it at the product catalogue would mean downloading and re-encoding **278 MB of
source PNGs on every deploy** for no gain over a URL parameter.

### Loading strategy

- **Homepage shop photograph is the LCP element** — `loading="eager"`, `fetchpriority="high"`, and
  it must carry explicit `width`/`height` to avoid layout shift.
- **Detail hero**: eager, high priority.
- **Grid**: the first row eager, everything below `loading="lazy"`. At 36 per page and ~16 KB each
  this matters less than it would have at 171 KB, but it is free.
- Every image gets **explicit dimensions**; `alt` is the product title, empty for decorative shop
  photography that sits beside a heading saying the same thing.
