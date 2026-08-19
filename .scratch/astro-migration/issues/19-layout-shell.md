# Layout shell: header, footer, status

Type: task
Status: open
Blocked by: 17

## Question

The chrome every page shares, per ticket 05.

**Header**: logo (38px desktop / 30px mobile), 三和文藝公司 leading with the English name beneath,
nav with a 2px `#CC0000` rule on the active item, locale **dropdown** (never flags), mobile burger
opening the full-screen menu.

**Footer**: the sitemap footer — navigation columns, seven-day hours strip with today highlighted,
getting-here, 118px wordmark band (52px mobile). No credit line, no language section.

**Status chip** (ticket 16): plain module script, not a React island. Build-time fetch of both
`1823.gov.hk` feeds — **strip the UTF-8 BOM** — with a checked-in snapshot fallback. Prerendered
HTML carries the hours summary, never a computed state. Fails to "check our hours" past the list.
