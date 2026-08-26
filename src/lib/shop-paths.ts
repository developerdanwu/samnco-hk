import { CATEGORIES, getAllProducts, getCategoryCounts, type Category, type Product } from "./contentful.ts";

export const PER_PAGE = 36;

export interface ShopPageProps {
  products: Product[]; total: number; counts: Record<string, number>;
  category: Category | null; page: number; totalPages: number;
}

const isCategory = (value: string): value is Category => (CATEGORIES as readonly string[]).includes(value);

/**
 * Resolve one /shop route from its rest param, at request time.
 *
 * Accepts: `undefined` (all products, page 1), `page/N`, `<category>`, `<category>/page/N`.
 * Anything else — unknown category, non-numeric or out-of-range page — returns null so the
 * route can answer 404 rather than render an empty grid. This is the boundary where a URL
 * typed by a human (or a stale link) becomes trusted data.
 *
 * Path-based, NOT `?page=N`: an ISR entry does not vary by query string, so query-param
 * pagination would serve page 1's bytes for every page (issue 08).
 *
 * Pagination is 1-based with `skip = (n - 1) * PER_PAGE`. The Flask site used `page * 36`, so
 * clicking "1" jumped to products 37–72 and the last page rendered empty. Not reproduced.
 */
export async function resolveShopPath(path: string | undefined): Promise<ShopPageProps | null> {
  const segments = (path ?? "").split("/").filter(Boolean);

  let category: Category | null = null;
  let rest = segments;
  if (segments.length > 0 && isCategory(segments[0])) {
    category = segments[0];
    rest = segments.slice(1);
  }

  let page = 1;
  if (rest.length > 0) {
    if (rest.length !== 2 || rest[0] !== "page") return null;
    if (!/^[1-9][0-9]*$/.test(rest[1])) return null;
    page = Number(rest[1]);
  } else if (segments.length > 0 && category === null) {
    return null; // a single unknown segment: not a category, not `page/N`
  }

  const [all, counts] = await Promise.all([getAllProducts(), getCategoryCounts()]);
  const items = category ? all.filter((p) => p.category === category) : all;
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  if (page > totalPages) return null;

  return {
    products: items.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: items.length,
    counts,
    category,
    page,
    totalPages,
  };
}

/**
 * One product and its related items, by `sys.id` — unchanged from the Flask site, so every
 * indexed detail URL survives byte-identical (issue 08). Slugs are impossible: 122 of 348
 * titles collide when slugified (issue 02). Null when the id is unknown or unpublished.
 */
export async function getDetailProps(id: string): Promise<{ product: Product; related: Product[] } | null> {
  const all = await getAllProducts();
  const product = all.find((p) => p.id === id);
  if (!product) return null;
  return {
    product,
    related: all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4),
  };
}

/**
 * Every /shop pathname (unprefixed, English form), page 1 at the bare path and pages 2..n under
 * /page/N. Used to build the sitemap and to scope ISR purges after a Contentful publish —
 * adding or removing a product reflows page boundaries across the whole catalogue, so the
 * shop pages are purged as a set, not individually.
 */
export async function shopPathnames(): Promise<string[]> {
  const all = await getAllProducts();
  const out: string[] = [];

  const add = (count: number, category: Category | null) => {
    const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
    const base = category ? `/shop/${category}` : "/shop";
    for (let page = 1; page <= totalPages; page++) {
      out.push(page === 1 ? base : `${base}/page/${page}`);
    }
  };

  add(all.length, null);
  for (const c of CATEGORIES) add(all.filter((p) => p.category === c).length, c);
  return out;
}

/** Every /detail pathname (unprefixed, English form). */
export async function detailPathnames(): Promise<string[]> {
  return (await getAllProducts()).map((p) => `/detail/${p.id}`);
}
