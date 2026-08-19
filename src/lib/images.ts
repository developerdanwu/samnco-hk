/**
 * Cloudinary URL helper.
 *
 * Product images are Cloudinary URLs stored on the Contentful entry, and they carry NO width
 * transform — so the live site ships ~171 KB per thumbnail, 6 MB for a 36-product grid page.
 * Adding `w_400` brings that to ~0.55 MB (issue 15).
 *
 * Two stored shapes exist across the 348 entries:
 *     /upload/f_auto,q_auto/     (237)
 *     /upload/f_auto/            (111)
 * Both deliver byte-identical responses, so the inconsistency is cosmetic — but the helper must
 * PARSE AND REPLACE the segment, never append. Appending yields
 * `/upload/f_auto/f_auto,q_auto,w_400/`, which Cloudinary mis-renders.
 */

const UPLOAD_SEGMENT = /\/upload\/[^/]+\//;

/** Rendered widths come from the Ledger layouts (issue 05). */
export const GRID_WIDTHS = [200, 400, 600] as const;
export const DETAIL_WIDTHS = [400, 800, 1200] as const;

export const GRID_SIZES = "(min-width: 900px) 250px, 45vw";
export const DETAIL_SIZES = "(min-width: 900px) 550px, 92vw";

/**
 * Returns the URL at a given width. `c_limit` never upscales past the source.
 * An unrecognised URL is returned UNCHANGED rather than guessed at — the page still works,
 * just at full size. This never throws.
 */
export function imageUrl(src: string | null | undefined, width: number): string | null {
  if (!src) return null;
  if (!UPLOAD_SEGMENT.test(src)) return src;
  return src.replace(UPLOAD_SEGMENT, `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

export function srcSet(src: string | null | undefined, widths: readonly number[]): string | null {
  if (!src) return null;
  const parts = widths.map((w) => `${imageUrl(src, w)} ${w}w`);
  return parts.join(", ");
}

export const gridSrcSet = (src?: string | null) => srcSet(src, GRID_WIDTHS);
export const detailSrcSet = (src?: string | null) => srcSet(src, DETAIL_WIDTHS);
