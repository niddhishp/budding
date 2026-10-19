import { useState } from "react";
import type { ProductMedia } from "@/lib/shop-media";
export function ProductPicture({
  item,
  title,
}: {
  item?: ProductMedia;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!item?.image || failed)
    return (
      <span className="text-xs text-slate-500 text-center p-4">
        Picture unavailable
      </span>
    );
  // Amazon images must not pass through an optimiser or our persistent storage.
  return (
    <img
      src={item.image.url}
      alt={title}
      width={item.image.width}
      height={item.image.height}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-44 object-contain"
    />
  );
}
