import { useLocale, useTranslations } from "next-intl";
import Photo from "@/components/photo";
import { inLanguage } from "@/components/site/blocks/block-helpers";

// A set of photos. In the mosaic, the first one is bigger than the rest.
export default function GalleryBlock({ block, context }) {
  const t = useTranslations("Restaurant");
  const locale = useLocale();
  const photos = block.props.photos ?? [];
  if (photos.length === 0) {
    return context.editing ? <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">{t("galleryEmpty")}</p> : null;
  }

  const mosaic = block.variant === "mosaic";
  const title = inLanguage(block.props.title, locale) || t("galleryTitle");
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <h2 className="font-display text-h2 font-extrabold">{title}</h2>
      <ul className={`grid gap-3 ${mosaic ? "grid-cols-2 @min-[48rem]:grid-cols-4" : "grid-cols-2 @min-[48rem]:grid-cols-3"}`}>
        {photos.map((photo, index) => (
          // The same photo may be chosen twice, so its id alone isn't unique
          <li key={`${photo.id}-${index}`} className={`relative overflow-hidden rounded-lg bg-surface-muted ${mosaic ? `aspect-square ${index === 0 ? "col-span-2 row-span-2" : ""}` : "aspect-[4/3]"}`}>
            <Photo photo={photo} kind="block" alt={t("galleryPhoto", { number: index + 1 })} sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
          </li>
        ))}
      </ul>
    </section>
  );
}
