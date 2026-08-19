# Cutover plan

Type: task
Status: resolved
Blocked by: 01, 08

## Question

How does the Astro site replace the Flask deployment on samnco-hk.com without downtime, without
losing search rankings, and with a way back if it goes wrong?

- **Sequence.** Does Astro deploy to a preview URL for review before touching the production
  domain, or replace the existing Vercel project in place? Whether it is the same Vercel project or
  a new one determines what happens to the domain and the environment variables.
- **Environment variables** on Vercel: the Contentful credentials the search route needs at runtime
  and the build needs at build time, plus deleting the now-dead `SECRET_KEY`.
- **Redirects live** before or with the cutover, per whatever the URL ticket decided.
- **The Contentful rebuild webhook.** Configured against the new project, and verified by making a
  real edit in Contentful and watching the site update.
- **Deleting Flask.** `main.py`, `products.py`, `forms.py`, `ui.py`, `vercel.json`, `Procfile`,
  `requirements.txt`, `.python-version`, `templates/`, `__pycache__/`, `venv/` and the `old files/`
  directory — which includes a checked-in `lodash` tree and a `sam v2.zip`. Decide whether these are
  deleted in the cutover commit or earlier, and whether anything in `old files/` is worth keeping
  (`sitemap.xml` and `robots.txt` live there).
- **Rollback.** What the path back to the Flask deployment is if something is badly wrong after
  cutover, and how long that path stays open.
- **Post-cutover verification.** A concrete checklist: every route in both locales, search against
  real data, a product detail page with multiple images and one with none, the 404, Open Graph
  previews, and mobile.

Resolved when the site is live on the domain and the checklist passes.

## Answer

### Facts established from the live project

- Vercel project **`samnco-hk`** (`prj_Oe3pmuaHAsadkkXxh6zrWiTxbRPj`), org `developerdanwus-projects`.
- **`samnco-hk.shop` is attached to this project** and serving; apex 301s to `www`.
- **Framework Preset is `undefined`, Build Command `None`, Output Directory `None`** — the Python
  function is wired purely through `vercel.json`. All three must be set for Astro.
- **Node 24.x** — fine for Astro 7.
- Git remote is **`developerdanwu/samnco-hk` on GitHub** (via a local SSH host alias, which is a
  local config detail and irrelevant to Vercel).
- **The project shows no Git connection** — deployments are CLI-pushed. This matters more than it
  looks: see step 2.

### Decision: same Vercel project, not a new one

The domain is already attached, the certificate is already issued, and the environment already
exists. Creating a second project would mean moving a live domain between projects for no gain.
**Vercel preview deployments make a new project unnecessary** — a branch gets a complete, working URL
to test against real Contentful data before anything touches production.

### Sequence

**1 — Build on a branch.** All Astro work on `astro-migration`. Every push gets a preview URL; the
Flask site stays in production, untouched, throughout.

**2 — Connect the repo to Vercel.** Currently CLI-only. **The Contentful rebuild webhook agreed at
charting depends on this**: Vercel Deploy Hooks are configured per branch under Git settings, so
without a connected repository there is no URL for Contentful to call and the "catalogue edits
trigger a rebuild" decision quietly does not work. *Confirm this in the dashboard rather than
trusting it — it is the one claim here I could not verify from the CLI.*

**3 — Set the framework.** Preset → Astro; Build Command and Output Directory to Astro's defaults.
Delete `vercel.json` in the same commit — its `functions` block references `main.py`, and a stale
Python function config alongside an Astro build is exactly the sort of thing that half-works.

**4 — Environment variables.** Add `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_TOKEN` for
Production and Preview, **as normal encrypted variables, never Sensitive** — Sensitive is why they
could not be read back in ticket 01 and cost a human round trip. **Leave the old `SPACE_ID`,
`ACCESS_TOKEN` and `SECRET_KEY` in place for now** — see step 8.

**5 — Verify on the preview URL** against the checklist below, in both locales.

**6 — Promote.** Merge to `master` and promote the deployment. The domain does not move; the alias
just points at the new deployment. **Downtime is zero** — Vercel swaps atomically.

**7 — Wire the Contentful webhook** to the Vercel Deploy Hook, then **prove it**: make a real edit in
Contentful and watch the site rebuild. An unverified webhook is not a webhook.

**8 — Only then, clean up.** Delete `main.py`, `products.py`, `forms.py`, `ui.py`, `Procfile`,
`requirements.txt`, `.python-version`, `templates/`, `__pycache__/`, `venv/`, `.idea/`, the
`.DS_Store` files, and the whole `old files/` directory — which carries a checked-in `lodash` tree, a
`sam v2.zip`, and a stale `sitemap.xml`/`robots.txt` still pointing at the dead `.com`. Both are
regenerated by Astro. Move `public/static/images/` to `src/assets/` first (ticket 15); the rest of
`public/static/` goes.

**Only after the rollback window closes**, delete `SPACE_ID`, `ACCESS_TOKEN` and `SECRET_KEY` from
Vercel.

### Rollback

**Vercel keeps every previous deployment, and promoting one back is instant** — the current Flask
production deployment stays promotable. But it only works while the variables it reads still exist:
`main.py` reads `SPACE_ID` / `ACCESS_TOKEN` and `app.config['SECRET_KEY']` fails at import without
`SECRET_KEY`. **Deleting those three variables is what actually ends the ability to roll back**, not
deleting the files — the files live in git history either way.

**Keep them for two weeks after cutover.** That is the rollback window, and it costs nothing.

### Post-cutover checklist

Both locales unless noted.

- `/`, `/about`, `/shop`, each of the five `/shop/<category>`, a `/detail/<sys.id>`, and a 404.
- **Every existing English URL byte-identical** (ticket 08) — spot-check a detail URL from the live
  site before cutover and confirm it still resolves after.
- Apex `samnco-hk.shop` still 301s to `www`.
- **Search** against real data: a hit, a miss, a two-character query, a Chinese query on the zh-HK
  locale showing `search_en_only`.
- Pagination: page 1, the last page (**must not be an empty grid** — the current bug), and the
  off-by-one gone.
- **Open/closed status** correct against Hong Kong time — check from a non-HK clock.
- A product with no price (94% of them) renders correctly; no empty headings.
- **`og:url` and canonical now on `samnco-hk.shop`**, not the dead `.com`. Paste a URL into WhatsApp
  and confirm the preview resolves — this was broken on the live site before the migration.
- `hreflang` alternates present and pointing at real pages; `sitemap.xml` and `robots.txt` regenerated.
- **Image weight**: a shop page should be ≈0.55 MB of images, not 6 MB (ticket 15).
- Mobile: the burger menu, the language dropdown, and a 44px tap target audit.
- Lighthouse on `/` and `/shop`, mobile profile, recorded as the baseline.
