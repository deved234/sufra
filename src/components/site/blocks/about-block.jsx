import { useLocale } from "next-intl";
import Photo from "@/components/photo";
import { inLanguage } from "@/components/site/blocks/block-helpers";

// The restaurant's story. Text an owner left empty in this language shows nothing.
export default function AboutBlock({ block }) {
  const locale = useLocale();
  const title = inLanguage(block.props.title, locale);
  const body = inLanguage(block.props.body, locale);
  if (!title && !body) return null;

  const { photo } = block.props;
  const withPhoto = block.variant === "media" && photo;
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className={withPhoto ? "grid items-center gap-8 @min-[48rem]:grid-cols-2" : "max-w-2xl"}>
        <div className="flex flex-col gap-4">
          {title && <h2 className="font-display text-h2 font-extrabold">{title}</h2>}
          {body && <p className="whitespace-pre-line text-lg text-muted-foreground">{body}</p>}
        </div>
        {withPhoto && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted">
            <Photo photo={photo} kind="block" alt={title} sizes="(min-width: 768px) 480px, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
