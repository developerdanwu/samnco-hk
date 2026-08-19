# Shop grid: categories and pagination

Type: task
Status: open
Blocked by: 18, 19

## Question

Four across desktop, **two across mobile**. Card is image tile + serif title + category — **no price
anywhere** (94% lack one) and no `category2` slot.

Category filters carry counts and scroll horizontally on mobile. Routes `/shop` and
`/shop/<category>` unchanged (ticket 08).

**Pagination is 1-based with `skip = (N-1) * 36`** — the current site computes `page * 36`, so
clicking "1" jumps to products 37–72 and the last page renders empty. Do not reproduce it.

Grid images: `srcset` at w_200/400/600, first row eager, rest lazy. A shop page should weigh
**~0.55 MB of images, not 6 MB** (ticket 15).
