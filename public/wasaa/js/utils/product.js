// Helpers for optional product fields. The API may or may not send
// compareAtPrice / rating / reviewCount; the UI only shows them when present.

export const productImage = (product) => product.images?.[0]?.url ?? product.image ?? null;

export function discountPercent(product) {
  const price = Number(product.price);
  const was = Number(product.compareAtPrice);
  if (!was || !price || was <= price) return 0;
  return Math.round((1 - price / was) * 100);
}

export const isDeal = (product) => discountPercent(product) > 0;

export const hasRating = (product) => Number(product.rating) > 0;
