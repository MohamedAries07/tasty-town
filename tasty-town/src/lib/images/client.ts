/** Shrinks big phone photos in the browser so uploads stay under the host's request-size limit. */
const LIMIT = 3.5 * 1024 * 1024;

export async function prepareForUpload(file: File): Promise<File> {
  if (file.size <= LIMIT) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
    if (blob && blob.size <= LIMIT * 1.1) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch { /* fall through */ }
  return file;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Review photos are shrunk in the browser so up to three fit in one request. */
export async function shrinkForReview(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    if (blob) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch { /* fall through */ }
  if (file.size > 1.2 * 1024 * 1024) throw new Error("One of your photos is too large for this browser to shrink. Please choose a smaller one.");
  return file;
}
