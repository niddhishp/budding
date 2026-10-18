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
