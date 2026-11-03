import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../src/lib/contrast.ts";

test("brand colour pairs meet WCAG AA (4.5:1 for text)", () => {
  const pairs: [string, string, string][] = [["#101010", "#FAFAF8", "body text on page"], ["#101010", "#FFFFFF", "text on cards"], ["#737373", "#FFFFFF", "secondary text on cards"],
    ["#737373", "#FAFAF8", "secondary text on page"], ["#101010", "#B8F52A", "text on lime buttons"], ["#B8F52A", "#101010", "lime on black header"], ["#FFFFFF", "#101010", "white on black"],
    ["#c4301c", "#FFFFFF", "error text"], ["#167a35", "#FFFFFF", "success text"], ["#8a5a00", "#fff1d6", "pending badge"], ["#a02312", "#fde4e0", "cancelled badge"], ["#c4301c", "#FAFAF8", "offer label"]];
  for (const [fg, bg, name] of pairs) assert.ok(contrastRatio(fg, bg) >= 4.5, `${name}: ${contrastRatio(fg, bg).toFixed(2)}`);
});
test("contrast helper is correct", () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#FFFFFF") - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio("#777777", "#FFFFFF") - 4.48) < 0.05);
});
