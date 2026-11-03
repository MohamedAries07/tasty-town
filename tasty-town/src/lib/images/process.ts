import sharp, { type Sharp } from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export type ImageTarget = "product" | "banner" | "category" | "asset" | "review";
export type Variant = { name: string; ext: "avif" | "webp"; buffer: Buffer; width: number; height: number; size: number };
export type Processed = { variants: Variant[]; format: string; originalBytes: number; totalBytes: number };

export class ImageError extends Error {}

type Kind = "jpeg" | "png" | "webp" | "heif";

/** Detect the real format from magic bytes. Never trust the client MIME type or file name. */
export function sniffFormat(b: Buffer): Kind | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.toString("ascii", 4, 8) === "ftyp" && /^(heic|heix|heim|heis|hevc|hevx|mif1|msf1)$/.test(b.toString("ascii", 8, 12))) return "heif";
  return null;
}

const SPECS: Record<ImageTarget, { name: string; ext: "avif" | "webp"; q: number; w: number; h: number }[]> = {
  product: [
    { name: "detail", ext: "avif", q: 82, w: 1200, h: 1200 },
    { name: "card", ext: "webp", q: 84, w: 700, h: 700 },
    { name: "thumb", ext: "webp", q: 82, w: 240, h: 240 },
  ],
  banner: [
    { name: "banner", ext: "avif", q: 82, w: 1600, h: 900 },
    { name: "thumb", ext: "webp", q: 82, w: 240, h: 240 },
  ],
  review: [{ name: "photo", ext: "webp", q: 82, w: 1000, h: 1000 }],
  asset: [
    { name: "banner", ext: "avif", q: 82, w: 1600, h: 900 },
    { name: "thumb", ext: "webp", q: 82, w: 240, h: 240 },
  ],
  category: [
    { name: "card", ext: "webp", q: 84, w: 700, h: 700 },
    { name: "thumb", ext: "webp", q: 82, w: 240, h: 240 },
  ],
};

export async function processImage(input: Buffer, target: ImageTarget): Promise<Processed> {
  if (input.length === 0) throw new ImageError("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("The image is larger than 8 MB.");
  const kind = sniffFormat(input);
  if (!kind) throw new ImageError("Unsupported file. Please upload a JPEG, PNG, WebP or HEIC image.");

  let base: Sharp;
  try {
    base = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 });
    const meta = await base.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
    // rotate() applies EXIF orientation; sharp drops all metadata on output by default.
    base = base.rotate();
  } catch {
    throw new ImageError(kind === "heif"
      ? "HEIC photos can't be decoded on this server. Please upload a JPEG or PNG (most phones can share as JPEG)."
      : "This image is damaged or can't be read.");
  }

  const variants: Variant[] = [];
  for (const s of SPECS[target]) {
    const pipe = base.clone().resize({ width: s.w, height: s.h, fit: "inside", withoutEnlargement: true });
    const out = s.ext === "avif" ? pipe.avif({ quality: s.q, effort: 4 }) : pipe.webp({ quality: s.q });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });
    variants.push({ name: s.name, ext: s.ext, buffer: data, width: info.width, height: info.height, size: data.length });
  }
  return { variants, format: variants[0].ext, originalBytes: input.length, totalBytes: variants.reduce((a, v) => a + v.size, 0) };
}
