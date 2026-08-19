# Contentful content layer and image helper

Type: task
Status: resolved
Blocked by: 17

## Question

One typed module that owns all Contentful access. Per ticket 02: content type \`samAndCoProducts\`,
348 entries, fields `title` (100%), `category` (100%, five clean values), `price` (**6.3%**),
`image` (100%, **exactly one each**), plus `category2`/`variants`/`isUmbrellaProduct` which are
**not ported**.

Fetch all 348 at build for `getStaticPaths`. Validate at the boundary — never trust the CMS.

The **image URL helper** (ticket 15) is a parse-and-replace on `/upload/<segment>/`, never a
concatenation, handling both stored shapes and passing unknown URLs through untouched.

## Answer

**Done.** Two modules, verified against the live space by exercising them during a real Astro build
— not by mocking.

- **`src/lib/contentful.ts`** — the only module that talks to Contentful.
- **`src/lib/images.ts`** — the Cloudinary URL helper.

### Verified against live data

| check | result |
| --- | --- |
| products fetched | **348** |
| with a price | **22 (6.3%)** |
| invalid category | 0 |
| missing image | 0 |
| category counts | office-stationery 171, seasonal 84, art-supplies 77, lifestyle 10, children 6 — **sum 348** |
| `getProduct(id)` round-trip | passes |
| both stored URL shapes normalise | `f_auto,q_auto` and `f_auto` → `f_auto,q_auto,w_400,c_limit` |
| unrecognised URL | returned **unchanged**, never guessed |
| double-segment bug | absent |

Every number matches ticket 02 independently, which is a real cross-check: the audit was a separate
agent querying the API directly, this is the shipping code path.

### Design notes

- **Typed env via `astro:env`.** `CONTENTFUL_SPACE_ID` / `CONTENTFUL_DELIVERY_TOKEN` /
  `CONTENTFUL_ENVIRONMENT` are declared as server secrets in `astro.config.mjs`, so a missing
  credential **fails the build immediately with a clear message** rather than surfacing as an opaque
  Contentful 404 at page-render time — which is exactly how ticket 01 started.
- **Validation at the boundary, degrading not exploding.** A malformed entry is skipped with a
  `console.warn` and the build continues: one product missing beats a broken deploy. The audit found
  none today, but Contentful is edited by humans.
- **Upstream errors never leak the body** — it echoes the query shape. Only the status code is
  surfaced.
- **Process-level cache**, so ~700 prerendered pages fetch the catalogue once rather than per page.
- `category2`, `variants`, `isUmbrellaProduct` and the `umbrellaProduct` / `categoryType` content
  types are **not modelled at all** — not ported, per tickets 02 and 14.
- `searchProducts()` lives here too, and is title-match only: **full-text was measured and rejected**
  in ticket 09.

### One trap

**TypeScript 7 has removed `baseUrl`** — `error TS5102`. shadcn's documentation still instructs you
to set it. Removing it is correct: `paths` then resolves relative to `tsconfig.json`, and the `@/*`
alias keeps working for the shadcn components. Commented in `tsconfig.json`.
