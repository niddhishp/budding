export type ProductMedia = {
  asin: string;
  image: { url: string; width: number; height: number } | null;
  price: number | null;
  checkedAt: string;
  expiresAt: string;
};
export const MEDIA_TTL = 10 * 60 * 1000;
export function mediaIsFresh(item: ProductMedia, now = Date.now()) {
  return Date.parse(item.expiresAt) > now && Date.parse(item.checkedAt) <= now;
}
