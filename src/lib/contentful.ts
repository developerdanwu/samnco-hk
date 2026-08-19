/**
 * The only module that talks to Contentful.
 *
 * Content model established empirically in issue 02 across all 348 entries:
 *   title     Symbol   required, 100%
 *   category  Symbol   required, 100%, always one of the five slugs below
 *   price     Number   6.3% — a card with NO price is the normal case
 *   image     Object   100%, and EXACTLY ONE per entry — never a gallery
 * `category2`, `variants`, `isUmbrellaProduct` and the `umbrellaProduct` /`categoryType`
 * content types are deliberately NOT ported (issues 02, 14).
 */
import {
  CONTENTFUL_SPACE_ID,
  CONTENTFUL_DELIVERY_TOKEN,
  CONTENTFUL_ENVIRONMENT,
} from "astro:env/server";

const CONTENT_TYPE = "samAndCoProducts";
const PAGE_SIZE = 100;
const API = "https://cdn.contentful.com";

/** The five real category slugs. Counts are from issue 02, for reference only. */
export const CATEGORIES = [
  "office-stationery",
  "seasonal-products",
  "art-supplies",
  "lifestyle",
  "children",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Product {
  id: string;
  title: string;
  category: Category;
  /** null for 94% of the catalogue — the design must not lean on it (issue 05). */
  price: number | null;
  /** Cloudinary URL. Pass through `imageUrl()` before rendering (issue 15). */
  image: string;
}

function endpoint(params: Record<string, string | number>): string {
  const qs = new URLSearchParams({ content_type: CONTENT_TYPE, ...mapValues(params) });
  return `${API}/spaces/${CONTENTFUL_SPACE_ID}/environments/${CONTENTFUL_ENVIRONMENT}/entries?${qs}`;
}
const mapValues = (o: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));

async function request(params: Record<string, string | number>): Promise<any> {
  const res = await fetch(endpoint(params), {
    headers: { Authorization: `Bearer ${CONTENTFUL_DELIVERY_TOKEN}` },
  });
  if (!res.ok) {
    // Never leak the upstream body — it echoes the query shape.
    throw new Error(`Contentful responded ${res.status} for content_type=${CONTENT_TYPE}`);
  }
  return res.json();
}

/**
 * Validate at the boundary. The audit found no bad entries today, but Contentful is editable by
 * a human, so a malformed entry must degrade to "one product missing" rather than a broken build.
 * Returns null and warns; the caller filters.
 */
function toProduct(entry: any): Product | null {
  const id = entry?.sys?.id;
  const f = entry?.fields ?? {};
  const title = typeof f.title === "string" ? f.title.trim() : "";

  const rawImage = Array.isArray(f.image) ? f.image[0] : f.image;
  const image = typeof rawImage?.secure_url === "string" ? rawImage.secure_url : "";

  if (!id || !title || !image) {
    console.warn(`[contentful] skipping entry ${id ?? "(no id)"} — missing title or image`);
    return null;
  }
  if (!CATEGORIES.includes(f.category)) {
    console.warn(`[contentful] entry ${id} has unknown category ${JSON.stringify(f.category)} — skipping`);
    return null;
  }
  return {
    id,
    title,
    category: f.category,
    price: typeof f.price === "number" && Number.isFinite(f.price) ? f.price : null,
    image,
  };
}

let cache: Product[] | null = null;

/** Every published product. Cached per process, so ~700 prerendered pages fetch once. */
export async function getAllProducts(): Promise<Product[]> {
  if (cache) return cache;
  const out: Product[] = [];
  let skip = 0;
  let total = Infinity;
  while (skip < total) {
    const data = await request({ limit: PAGE_SIZE, skip, order: "sys.createdAt" });
    total = data.total;
    for (const entry of data.items) {
      const p = toProduct(entry);
      if (p) out.push(p);
    }
    skip += PAGE_SIZE;
  }
  cache = out;
  return out;
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  return (await getAllProducts()).filter((p) => p.category === category);
}

export async function getProduct(id: string): Promise<Product | null> {
  return (await getAllProducts()).find((p) => p.id === id) ?? null;
}

export async function getCategoryCounts(): Promise<Record<Category, number>> {
  const products = await getAllProducts();
  return Object.fromEntries(
    CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length]),
  ) as Record<Category, number>;
}

/**
 * Title search, used by /api/search at request time (issue 23).
 * Title-only is deliberate: full-text was measured and rejected — identical on every real
 * product term, and differs only by dumping whole categories ("office" returns 178 of 348).
 */
export async function searchProducts(q: string, limit: number): Promise<{ items: Product[]; total: number }> {
  const data = await request({
    limit,
    "fields.title[match]": q,
    select: "sys.id,fields.title,fields.category,fields.image,fields.price",
  });
  const items = data.items.map(toProduct).filter((p: Product | null): p is Product => p !== null);
  return { items, total: data.total };
}
