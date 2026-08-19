import { CATEGORIES, getAllProducts, getCategoryCounts, type Category, type Product } from "./contentful.ts";

export const PER_PAGE = 36;

export interface ShopPageProps {
  products: Product[]; total: number; counts: Record<string, number>;
  category: Category | null; page: number; totalPages: number;
}

/**
 * Every /shop route: all-products and per-category, page 1 at the bare path and pages 2..n
 * under /page/N.
 *
 * Path-based, NOT `?page=N`: a statically prerendered document does not vary by query string,
 * so query-param pagination would have served page 1's bytes for every page (issue 08).
 *
 * Pagination is 1-based with `skip = (n - 1) * PER_PAGE`. The Flask site used `page * 36`, so
 * clicking "1" jumped to products 37–72 and the last page rendered empty. Not reproduced.
 */
export async function shopPaths() {
  const all = await getAllProducts();
  const counts = await getCategoryCounts();
  const out: { params: { path: string | undefined }; props: ShopPageProps }[] = [];

  const add = (items: Product[], category: Category | null) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    for (let page = 1; page <= totalPages; page++) {
      const slice = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      const seg = category ? category : "";
      const path = page === 1 ? seg || undefined : `${seg ? seg + "/" : ""}page/${page}`;
      out.push({
        params: { path },
        props: { products: slice, total: items.length, counts, category, page, totalPages },
      });
    }
  };

  add(all, null);
  for (const c of CATEGORIES) add(all.filter((p) => p.category === c), c);
  return out;
}
