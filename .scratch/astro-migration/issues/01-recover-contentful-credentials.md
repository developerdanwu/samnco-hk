# Recover Contentful credentials

Type: task
Status: resolved
Blocked by: —

## Question

Nothing in this effort can touch product data until the Contentful credentials are back in hand.
`.env` is gitignored and absent from the working directory, so `SPACE_ID`, `ACCESS_TOKEN` and
`SECRET_KEY` currently exist only on Vercel or in Dan's head.

There is nothing to decide here — this is manual work that unblocks decisions. Done when:

- The Contentful **Space ID** and a **Content Delivery API** token are recovered (Vercel project
  environment variables, or generated fresh from Contentful → Settings → API keys).
- Whether the space also needs a **Content Preview** or **Management** token is established — the
  build only reads published content, so Delivery is expected to be sufficient.
- The credentials are placed in a local `.env` (still gitignored) so build-time fetching works
  locally, and confirmed present in the Vercel project for deploys.
- It is confirmed that the Vercel project and the Contentful space are both still under Dan's
  control, and that the space has not been archived or downgraded to a plan that limits API access.
- `SECRET_KEY` is noted as **dead** — it exists only for Flask-WTF CSRF on the search form, and the
  form disappears with Flask. It should be deleted from Vercel at cutover, not carried forward.

Record in the answer: which credentials were recovered, where they now live, and the Contentful
space/environment identifiers later tickets will need.

## Progress — blocked on Dan

**Attempted AFK via the Vercel CLI. The values cannot be recovered this way; Dan must fetch them
from Contentful directly.** The ticket stays open.

### What was established

- The Vercel CLI is installed and authenticated as `developerdanwu`. The `samnco-hk` project exists
  and is now linked locally (`.vercel/`, gitignored).
- All three variables exist on Vercel — `SPACE_ID`, `ACCESS_TOKEN`, `SECRET_KEY` — set for Preview
  and Production, created 20 days ago.
- **`vercel env pull` returns all three as empty strings**, in both production and preview, while
  pulling `VERCEL_OIDC_TOKEN` (1178 chars) from the same file successfully. Decryption works; these
  three specifically are write-only. They were stored as **Sensitive**, which Vercel never allows to
  be read back — by design, not a fault.
- **The credentials themselves are valid.** `https://samnco-hk.vercel.app/` serves 3 discount items
  on the homepage and 36 products on `/shop`, live, right now. The Flask app is talking to Contentful
  successfully in production. Nothing is broken; the values are simply unreadable from outside.

### What Dan has to do

1. Log in to Contentful and open the space for Sam & Company.
2. **Settings → API keys**. Either read the existing key's **Space ID** and **Content Delivery API —
   access token**, or click *Add API key* to generate a fresh pair. Generating fresh is safe: CDA
   tokens are read-only, additive, and the existing one keeps working.
3. Put them in `.env` at the repo root (already gitignored, and the file already exists from the
   `vercel env pull`, so overwrite it):
   ```
   SPACE_ID=...
   ACCESS_TOKEN=...
   ```
4. Nothing needs adding to Vercel yet — the new project's variables are set up at cutover
   (ticket 10). When they are, **store them as normal encrypted variables, not Sensitive**, or this
   same problem recurs for the next person.

### Notes for later tickets

- **`SECRET_KEY` is confirmed dead.** It exists only for Flask-WTF CSRF on the search form, which
  disappears with Flask. Delete it at cutover.
- A **Content Preview** token is not needed — the build reads published content only.

## Answer

**Resolved.** Dan retrieved the Space ID and Content Delivery token from Contentful and placed them
in `.env`. Verified live against the CDA:

- Space name: **Sam and Company**
- Locales: **`en-US` only, default** — there is no zh-HK locale on the space
- Published `samAndCoProducts`: **348**, exactly matching the count derived independently from the
  live site in this ticket's Progress section

### Where things now live

- `.env` at the repo root, gitignored, holding the values twice: as
  `CONTENTFUL_SPACE_ID` / `CONTENTFUL_DELIVERY_TOKEN` (the names the Astro build will use), and as
  `SPACE_ID` / `ACCESS_TOKEN` (so the Flask app still runs locally for side-by-side comparison until
  it is deleted). The second pair goes at cutover.
- The Vercel project is linked locally via `.vercel/`, also gitignored.
- Environment: `master`. Content is read published-only, so no Preview token is needed.

### Carried forward

- **`SECRET_KEY` is dead** — Flask-WTF CSRF only. Delete from Vercel at cutover (ticket 10).
- **Store the new project's variables as normal encrypted, never Sensitive.** The originals were
  Sensitive, which is why they could not be read back and why this ticket needed a human at all.
- **No zh-HK locale exists on the space.** This confirms that full product-content translation
  (Out of scope) would require creating the locale *and* populating 348 entries — real work, not a
  toggle. Relevant context for ticket 07.
