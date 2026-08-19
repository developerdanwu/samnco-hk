import type { APIRoute } from "astro";

// On-demand: prerendering a search endpoint would freeze results at deploy time.
// Excluded from the locale middleware (issue 03). Real implementation in issue 23.
export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 64) {
    return Response.json({ ok: false, data: null, error: "q must be 2-64 characters" }, { status: 400 });
  }
  return Response.json({ ok: true, data: { items: [], total: 0, query: q }, error: null });
};
