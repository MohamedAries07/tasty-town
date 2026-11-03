export type RatedRow = { rating: number; status: string };

/** Average over PUBLISHED reviews only, to one decimal. */
export function averageRating(rows: RatedRow[]): { average: number | null; count: number } {
  const pub = rows.filter((r) => r.status === "published");
  if (pub.length === 0) return { average: null, count: 0 };
  return { average: Math.round((pub.reduce((a, r) => a + r.rating, 0) / pub.length) * 10) / 10, count: pub.length };
}
export function breakdown(rows: RatedRow[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) if (r.status === "published" && r.rating >= 1 && r.rating <= 5) out[r.rating as 1 | 2 | 3 | 4 | 5]++;
  return out;
}
/** Verified purchase = a completed order, and (if a product is named) that product was in the order. */
export function isVerifiedEligible(order: { status: string } | null, productInOrder: boolean | null): boolean {
  return !!order && order.status === "completed" && productInOrder !== false;
}
