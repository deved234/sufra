"use client";

/* eslint-disable @next/next/no-img-element -- small previews of stored photos */

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Field } from "@/components/form/field";
import PhotoField from "@/components/photos/photo-field";
import { BLOCKS } from "@/lib/site/blocks";
import { photoUrl } from "@/lib/photos/url";

// A block's settings. The form comes entirely from the list of blocks, so a new setting
// there shows up here by itself.
export default function BlockInspector({ block, slug, restaurant, onVariant, onProp, onFieldBlur }) {
  const t = useTranslations("SiteBuilder");
  if (!block) return <p className="p-4 text-sm text-muted-foreground">{t("selectBlock")}</p>;

  const { variants, fields } = BLOCKS[block.type];
  const needsCover = block.type === "hero" && !restaurant.cover && block.variant !== "tinted";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 font-bold">{t(`blocks.${block.type}`)}</h2>
        <p className="text-sm text-muted-foreground">{t(`help.${block.type}`)}</p>
      </div>

      {variants.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{t("look")}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <label key={variant} className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium has-focus-visible:outline-2 ${block.variant === variant ? "border-brand bg-brand-soft text-on-brand-soft" : "border-border-strong hover:bg-surface-muted"}`}>
                <input type="radio" name={`${block.id}-variant`} className="sr-only" checked={block.variant === variant} onChange={() => onVariant(block.id, variant)} />
                {t(`variants.${block.type}.${variant}`)}
              </label>
            ))}
          </div>
          {needsCover && (
            <p className="text-sm text-muted-foreground">
              {t("needsCover")}{" "}
              <Link href={`/dashboard/${slug}/settings#photos`} className="font-semibold text-brand-text hover:underline">
                {t("addCover")}
              </Link>
            </p>
          )}
        </fieldset>
      )}

      {Object.entries(fields).map(([name, field]) => (
        <FieldEditor key={name} name={name} field={field} block={block} slug={slug} restaurant={restaurant} onProp={onProp} onFieldBlur={onFieldBlur} />
      ))}
    </div>
  );
}

function FieldEditor({ name, field, block, slug, restaurant, onProp, onFieldBlur }) {
  const t = useTranslations("SiteBuilder");
  const dashboard = useTranslations("Dashboard");
  const value = block.props[name];
  const label = t(`fields.${name}`);
  const set = (next, group) => onProp(block.id, name, next, group);

  switch (field.type) {
    case "text":
    case "longText":
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{label}</legend>
          {["ar", "en"].map((lang) => (
            <Field
              key={lang}
              as={field.type === "longText" ? "textarea" : "input"}
              rows={field.type === "longText" ? 5 : undefined}
              label={dashboard(lang === "ar" ? "langAr" : "langEn")}
              lang={lang}
              dir={lang === "ar" ? "rtl" : "ltr"}
              maxLength={field.max}
              value={value?.[lang] ?? ""}
              onChange={(event) => set({ ar: value?.ar ?? "", en: value?.en ?? "", [lang]: event.target.value }, `${block.id}:${name}:${lang}`)}
              onBlur={onFieldBlur}
            />
          ))}
        </fieldset>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-brand" checked={value ?? field.default ?? false} onChange={(event) => set(event.target.checked)} />
          {label}
        </label>
      );
    case "select":
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{label}</legend>
          <div className="flex flex-wrap gap-4">
            {field.options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`${block.id}-${name}`} className="size-4 accent-brand" checked={(value ?? field.default) === option} onChange={() => set(option)} />
                {t(`options.${name}.${option}`)}
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "photo":
      // Keyed by the photo, so undo shows the photo it brought back
      return <PhotoField key={value?.id ?? "none"} slug={slug} kind="block" label={label} initial={value ?? null} onChange={(photo) => set(photo ?? undefined)} />;
    case "photos":
      return <PhotosField label={label} field={field} value={value ?? []} slug={slug} onChange={set} />;
    case "dishes":
      return <DishesField label={label} field={field} value={value ?? []} restaurant={restaurant} onChange={set} />;
    default:
      return null;
  }
}

function PhotosField({ label, field, value, slug, onChange }) {
  const t = useTranslations("SiteBuilder");
  const swap = (from, to) => {
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {value.map((photo, index) => (
            <li key={`${photo.id}-${index}`} className="flex flex-col gap-1">
              <img src={photoUrl(photo.id, 400)} alt={t("photoNumber", { number: index + 1 })} className="aspect-[4/3] w-full rounded-md bg-surface-muted object-cover" />
              <div className="flex justify-between text-sm">
                <button type="button" disabled={index === 0} aria-label={t("photoEarlier", { number: index + 1 })} onClick={() => swap(index, index - 1)} className="rounded-md px-2 py-1 hover:bg-surface-muted disabled:opacity-30">
                  <span aria-hidden className="inline-block rtl:-scale-x-100">←</span>
                </button>
                <button type="button" aria-label={t("photoRemove", { number: index + 1 })} onClick={() => onChange(value.filter((_, at) => at !== index))} className="rounded-md px-2 py-1 text-danger hover:bg-danger-soft">
                  ✕
                </button>
                <button type="button" disabled={index === value.length - 1} aria-label={t("photoLater", { number: index + 1 })} onClick={() => swap(index, index + 1)} className="rounded-md px-2 py-1 hover:bg-surface-muted disabled:opacity-30">
                  <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {value.length < field.max ? (
        // A new, empty field for each photo: the one just added moves to the list above
        <PhotoField key={value.length} slug={slug} kind="block" label={label} onChange={(photo) => photo && onChange([...value, photo])} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("photosFull", { max: field.max })}</p>
      )}
    </div>
  );
}

function DishesField({ label, field, value, restaurant, onChange }) {
  const t = useTranslations("SiteBuilder");
  const dishes = restaurant.menu.flatMap((category) => category.items);
  if (dishes.length === 0) return <p className="text-sm text-muted-foreground">{t("noDishes")}</p>;
  const full = value.length >= field.max;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">
        {label} <span className="font-normal text-muted-foreground">({t("chosenCount", { count: value.length, max: field.max })})</span>
      </legend>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {dishes.map((dish) => {
          const on = value.includes(dish.id);
          return (
            <li key={dish.id}>
              <label className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${!on && full ? "opacity-50" : "hover:bg-surface-muted"}`}>
                <input type="checkbox" className="size-4 accent-brand" checked={on} disabled={!on && full} onChange={() => onChange(on ? value.filter((id) => id !== dish.id) : [...value, dish.id])} />
                {dish.name}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
