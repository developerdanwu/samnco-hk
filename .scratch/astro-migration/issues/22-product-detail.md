# Product detail

Type: task
Status: resolved
Blocked by: 18, 19

## Question

Route `/detail/<sys.id>` — **unchanged**, so every indexed URL survives (ticket 08). 348 × 2 locales
= 696 prerendered pages.

One image, `srcset` w_400/800/1200, eager. **No gallery, no carousel, no Embla** — 0 of 348 entries
have a second image (ticket 15).

Contact block instead of a cart: WhatsApp primary, phone, email, address, hours. "Ask in store"
where there is no price. Related products from the same category.

## Answer

**Done. 696 detail pages (348 × 2 locales), 747 HTML files in total, all locale-correct.**

Build time for the whole site is **~5 seconds** — the process-level product cache means the
catalogue is fetched once, not once per page.

### Verified

| | |
| --- | --- |
| routes | `/detail/<sys.id>` and `/zh-hk/detail/<sys.id>` — **unchanged**, so every indexed URL survives |
| product **with** a price | renders `HK$170` in both locales |
| product **without** a price (94%) | `Ask in store` / **店內查詢** |
| images per page | 1 hero + 4 related — **never a gallery** |
| related products | 4, same category, self excluded |
| `embla-carousel` in dependencies | **no** |

### No gallery, and the dependency is genuinely absent

0 of 348 entries have a second image, so the Flask carousel looped `image[1:]` over nothing on
every product. Dropping it removes an island and keeps `embla-carousel-react` out of the bundle
entirely — confirmed absent from `package.json`, not merely unused.

### Price on detail, but not on the card

Ticket 05 ruled out price on the **grid card**, where showing it on 6% of tiles would read as
broken. On the detail page the opposite is true: where a price exists it is real information, and
where it does not, `Ask in store` is an honest and useful answer rather than an empty gap. Currency
is `HK$`, which is written the same way in both locales.

### Contact instead of a cart

WhatsApp as the primary action, phone beneath, then address with the live open/closed chip — so a
visitor deciding whether to travel sees the answer on the product page itself, not just the footer.
