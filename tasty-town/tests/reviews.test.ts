import { test } from "node:test";
import assert from "node:assert/strict";
import { averageRating, breakdown, isVerifiedEligible } from "../src/lib/reviews.ts";

test("averages use published reviews only", () => {
  const rows = [{ rating: 5, status: "published" }, { rating: 4, status: "published" }, { rating: 1, status: "pending" }, { rating: 1, status: "rejected" }];
  assert.deepEqual(averageRating(rows), { average: 4.5, count: 2 });
  assert.deepEqual(averageRating([{ rating: 3, status: "pending" }]), { average: null, count: 0 });
  assert.equal(averageRating([{ rating: 5, status: "published" }, { rating: 4, status: "published" }, { rating: 4, status: "published" }]).average, 4.3);
  assert.deepEqual(breakdown(rows), { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
});
test("verified purchase needs a completed order containing the product", () => {
  assert.equal(isVerifiedEligible({ status: "completed" }, true), true);
  assert.equal(isVerifiedEligible({ status: "completed" }, null), true);
  assert.equal(isVerifiedEligible({ status: "completed" }, false), false);
  assert.equal(isVerifiedEligible({ status: "pending_whatsapp" }, true), false);
  assert.equal(isVerifiedEligible({ status: "cancelled" }, true), false);
  assert.equal(isVerifiedEligible(null, true), false);
});
