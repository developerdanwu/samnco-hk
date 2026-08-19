# Decide the fate of samnco-hk.com

Type: grilling
Status: resolved
Blocked by: —

## Question

**samnco-hk.com does not resolve.** Discovered while working ticket 01:

- `dig @8.8.8.8 samnco-hk.com A` and `www.samnco-hk.com A` both return **nothing**. So does the `NS`
  query. The domain is unreachable from public DNS.
- The domain **is registered and active** — created 2015-06-14, registrar Launchpad.com Inc.
  (Bluehost), nameservers `NS1.JULYDNS.COM` / `NS2.JULYDNS.COM`. It has not lapsed.
- **Vercel has 0 domains configured** across the entire account. The custom domain was never
  attached to the Vercel project, or was detached.
- The live site is reachable **only** at `https://samnco-hk.vercel.app/`, where it works correctly.

So the site everyone believed was live on its own domain has in fact been dark at that address for
an unknown period, and is serving from a `.vercel.app` URL.

This has to be settled because **the map's Destination names samnco-hk.com as the finish line**, and
because two other tickets rest on premises this undermines.

- **Is the domain being kept?** If yes, the DNS zone at JulyDNS has to be repaired or the
  nameservers repointed, and the domain attached to the Vercel project. If no, the destination
  changes and `samnco-hk.vercel.app` — or a new domain — becomes the real address.
- **Does Dan still have access** to the Launchpad/Bluehost registrar account and the JulyDNS zone?
  This may be its own piece of manual recovery, like the Contentful credentials were.
- **How long has it been dark?** This determines how much of ticket 08's SEO-continuity argument
  survives. A domain that has not resolved for months is not being indexed, and the case for
  preserving `/detail/<product_id>` URLs weakens accordingly — possibly to nothing. Check Search
  Console if it is set up, or the Wayback Machine for when the domain last served.
- **Was the shop ever actually using it?** The footer and business cards may point customers here.
  Worth asking whether anyone has noticed it being down — that is a signal about how much traffic
  the site was really carrying.

Resolved when the domain's future is decided, its access confirmed, and the map's Destination
amended if it changes.

## Answer

**Ship on `samnco-hk.shop`, which is already the live production domain.** Dan named it in response
to this ticket, and it checks out:

- `samnco-hk.shop` and `www.samnco-hk.shop` both resolve and return **HTTP 200**, serving the current
  Flask site. The apex **301s to `www`**.
- `www.samnco-hk.shop` resolves via `ea018c2cb4f04cc4.vercel-dns-017.com` — already pointed at
  Vercel, attached at project level (it does not appear in `vercel domains ls` for the
  `developerdanwus-projects` scope).

### Correction to this ticket's premise

This ticket was raised on the belief that the site had gone dark. **It had not.** `samnco-hk.com`
genuinely does not resolve — that finding stands — but it is not the domain the site runs on. The
`.com` was inferred from `base.html`, which hardcodes `og:url` and `twitter:url` as
`https://www.samnco-hk.com/`. Those tags are simply stale.

### Consequences

- **The Destination changes to `samnco-hk.shop`.** Updated on the map.
- **The SEO-continuity argument is live again, not moot.** The site is up, on a real domain, and
  presumably indexed. Ticket 08's URL decision therefore has a genuine cost attached — the opposite
  of what this ticket's premise implied.
- **A real bug on the live site, found here:** every page declares `og:url` and `twitter:url` as
  `https://www.samnco-hk.com/` — a domain that does not resolve. Every social share and link preview
  currently points at a dead address, and any crawler honouring it is being sent nowhere. The Astro
  rebuild must emit canonical/OG URLs on `samnco-hk.shop`. Folded into ticket 08.
- **`samnco-hk.com` is out of scope.** It stays registered and dark. If Dan later wants it, it is a
  redirect to `.shop`, not a migration.
