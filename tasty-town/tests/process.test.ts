import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processImage, sniffFormat, ImageError } from "../src/lib/images/process.ts";

const make = (w: number, h: number, fmt: "jpeg" | "png" | "webp", orientation?: number) => {
  let s = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 40 } } });
  if (orientation) s = s.withMetadata({ orientation });
  return s[fmt]().toBuffer();
};

test("magic bytes detect real formats", async () => {
  assert.equal(sniffFormat(await make(50, 50, "jpeg")), "jpeg");
  assert.equal(sniffFormat(await make(50, 50, "png")), "png");
  assert.equal(sniffFormat(await make(50, 50, "webp")), "webp");
  assert.equal(sniffFormat(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
});

test("product variants: sizes, formats, aspect ratio preserved", async () => {
  const out = await processImage(await make(3000, 2000, "jpeg"), "product");
  const by = Object.fromEntries(out.variants.map((v) => [v.name, v]));
  assert.deepEqual(Object.keys(by), ["detail", "card", "thumb"]);
  assert.equal(by.detail.ext, "avif"); assert.equal(by.card.ext, "webp");
  assert.equal(by.detail.width, 1200); assert.equal(by.detail.height, 800);
  assert.equal(by.card.width, 700); assert.equal(by.thumb.width, 240);
  assert.equal((await sharp(by.detail.buffer).metadata()).format, "heif");
  assert.equal((await sharp(by.card.buffer).metadata()).format, "webp");
});

test("small images are not enlarged", async () => {
  const out = await processImage(await make(300, 200, "png"), "product");
  assert.equal(out.variants[0].width, 300);
});

test("banner fits within 1600x900", async () => {
  const out = await processImage(await make(4000, 4000, "jpeg"), "banner");
  assert.ok(out.variants[0].width <= 1600 && out.variants[0].height <= 900);
});

test("EXIF orientation is applied and metadata stripped", async () => {
  const out = await processImage(await make(400, 200, "jpeg", 6), "product");
  assert.equal(out.variants[0].width, 200); assert.equal(out.variants[0].height, 400);
  const meta = await sharp(out.variants[1].buffer).metadata();
  assert.equal(meta.exif, undefined);
});

test("rejects fake and oversized files", async () => {
  await assert.rejects(processImage(Buffer.from("not an image at all, just text"), "product"), ImageError);
  await assert.rejects(processImage(Buffer.alloc(9 * 1024 * 1024, 0xff), "product"), ImageError);
});
