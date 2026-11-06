import Image from "next/image";
import { PHOTO_KINDS, photoSrcSet, photoUrl } from "@/lib/photos/url";

// One photo, filling its positioned parent. Owners' photos come from Cloudinary, in the
// sizes it makes, which saves Vercel's limited image optimization. The demo restaurants'
// photos are files in the project and go through next/image.
export default function Photo({ photo, image, kind = "dish", alt = "", sizes, preload = false, className = "" }) {
  if (photo) {
    const { widths } = PHOTO_KINDS[kind];
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the sizes already exist, see above
      <img
        src={photoUrl(photo.id, widths[widths.length - 1])}
        srcSet={photoSrcSet(photo.id, kind)}
        sizes={sizes}
        alt={alt}
        width={photo.width}
        height={photo.height}
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload ? "high" : undefined}
        decoding="async"
        style={photo.blur ? { backgroundImage: `url(${photo.blur})`, backgroundSize: "cover" } : undefined}
        className={`absolute inset-0 size-full ${className}`}
      />
    );
  }
  if (image) return <Image src={image} alt={alt} fill sizes={sizes} placeholder="blur" preload={preload} className={className} />;
  return null;
}
