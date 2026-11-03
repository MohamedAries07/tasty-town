/** "50", "50.5", "50.50" -> paise. Returns null for anything else. No floating-point maths. */
export function parseRupees(input: string): number | null {
  const m = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(input.trim());
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0) : null;
}
export function paiseToInput(p: number | null | undefined): string {
  if (p === null || p === undefined) return "";
  return p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2);
}
export function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
