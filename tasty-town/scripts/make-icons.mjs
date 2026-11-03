// Generates the app icons from simple shapes (no fonts needed). Run: node scripts/make-icons.mjs
import sharp from "sharp";
const glyph = (s, ox, oy) => `<g fill="#B8F52A" transform="translate(${ox} ${oy}) scale(${s})"><rect x="96" y="150" width="160" height="48"/><rect x="152" y="150" width="48" height="210"/><rect x="256" y="150" width="160" height="48"/><rect x="312" y="150" width="48" height="210"/></g>`;
const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" ${maskable ? "" : 'rx="112"'} fill="#101010"/>${maskable ? glyph(0.72, 71.7, 71.7) : glyph(1, 0, 0)}</svg>`;
const out = [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true], ["apple-touch-icon.png", 180, true]];
for (const [name, size, maskable] of out) await sharp(Buffer.from(svg(maskable))).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`);
console.log("icons written");
