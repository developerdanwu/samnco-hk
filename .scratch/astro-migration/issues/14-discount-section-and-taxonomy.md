# Decide the fate of the Discount section and the `category2` field

Type: grilling
Status: resolved
Blocked by: —

## Question

The content audit found the homepage's "Discount Items" section is effectively empty and the field
powering it is broken.

- `category2` holds: **301 null**, **30 duplicates of `category`**, **16 genuine second categories**
  (6 misspelled `office-stationey`), and **exactly 1 entry set to `discount`**.
- So the homepage Discount section — a headline block on the landing page — currently renders **one
  unpriced ream of copier paper**.
- A `categories` array field already exists on the content type and is whitelisted, which is the
  obvious destination for genuine second categories.

Decisions:

- **Does the homepage keep a Discount section at all?** If discounts are not actually maintained in
  Contentful, the section is decoration that makes the shop look empty. Options: drop it; replace it
  with a curated "featured" selection; or keep it and commit to maintaining the flag. Dan should
  answer this as the shop's proxy — it is a merchandising question, not a technical one.
- **If something replaces it, how is the selection expressed in Contentful** so it is editable
  without a deploy? A boolean `featured` field, a dedicated content type, or an ordered list entry.
- **Does `category2` survive the migration?** Recommendation: no. Migrate the 16 genuine second
  categories into the `categories` array, fix the `office-stationey` misspelling, and drop
  `category2` from the new templates entirely. This is a **content edit in Contentful**, so decide
  who does it and when.
- **What replaces `category2` in the product card?** It currently renders as a bare `<h4>` beside
  `category`, and is null for 301 of 348 products — an empty heading on 86% of cards. Feeds ticket 05.

Resolved when the homepage section's fate is decided and the `category2` migration path is agreed.

## Answer

**Drop the Discount Items section from the homepage.** Dan's call.

It is the honest read of the data: exactly one of 348 products carries the `discount` flag, so the
section renders a single unpriced ream of copier paper under a headline heading. A merchandising
slot that makes the shop look empty is worse than no slot.

### Consequences

- The homepage loses the section entirely. Ticket 05's directions should **not** design around it —
  the homepage is hero, shop blurb, and find-us.
- `get_discount_items()` and its `fields.category2[match]=discount` query are not ported.
- **`category2` is retired.** It is null on 301 of 348 (86%) and carries no meaning worth keeping.
  The 16 genuine second categories should be migrated into the existing `categories` array (fixing
  the `office-stationey` misspelling) — a **Contentful content edit**, not code, and not urgent since
  nothing renders `category2` any more. Left as a note here rather than a ticket; raise one if the
  second categories turn out to matter to navigation.

### Worth knowing for later

A **`featured` Boolean field already exists** on the content type — 112 entries have it set, but
only **1 is true**. If a curated homepage selection is ever wanted, the field is already there and
whitelisted; it just needs populating. No schema change required.
