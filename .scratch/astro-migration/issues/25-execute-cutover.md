# Execute the cutover

Type: task
Status: open
Blocked by: 20, 21, 22, 23, 24

## Question

Run the sequence in ticket 10.

Connect the repo to Vercel — **the Contentful webhook depends on it**; set Framework Preset to Astro
and delete `vercel.json`; add `CONTENTFUL_*` as **normal encrypted, never Sensitive**; verify on the
preview URL in both locales; promote; wire and **prove** the webhook with a real Contentful edit.

Then delete Flask and `old files/`. **Keep `SPACE_ID` / `ACCESS_TOKEN` / `SECRET_KEY` for two
weeks** — deleting them, not the files, is what ends the ability to roll back.

Work the post-cutover checklist in ticket 10.
