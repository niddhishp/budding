import sharp from "sharp";
import { createHash } from "node:crypto";
export async function prepareFamilyPhoto(bytes: Buffer) {
  if (bytes.length > 3 * 1024 * 1024 || !bytes.length)
    throw Error("Choose a photo under 3 MB.");
  const input = sharp(bytes, { limitInputPixels: 24_000_000, animated: false });
  const meta = await input.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
    (meta.pages ?? 1) > 1
  )
    throw Error("Choose a still JPEG, PNG or WebP photo.");
  // Re-encoding strips EXIF, GPS, filenames and other embedded metadata by default.
  const photo = await input
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { photo, hash: createHash("sha256").update(photo).digest("hex") };
}
export const photoPath = (userId: string, id: string, hash: string) =>
  `${userId}/${id}-${hash}.jpg`;
/** A small private copy for the memory strip, stored beside the photo it was made from. */
export const thumbPath = (userId: string, id: string, hash: string) =>
  `${userId}/${id}-${hash}-thumb.webp`;
export const THUMB_WIDTH = 640;
export async function makeThumbnail(photo: Buffer) {
  const { data, info } = await sharp(photo, { limitInputPixels: 24_000_000 })
    .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.5, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer({ resolveWithObject: true });
  return { thumb: data, width: info.width, height: info.height };
}
