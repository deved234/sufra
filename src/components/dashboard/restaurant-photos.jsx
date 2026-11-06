"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/form/field";
import PhotoField from "@/components/photos/photo-field";
import { saveRestaurantPhoto } from "@/lib/photos/actions";

// The restaurant's cover and logo. Each saves as soon as it's chosen, like the hours.
export default function RestaurantPhotos({ slug, cover, logo }) {
  const t = useTranslations("Photos");
  const [error, setError] = useState(null);

  const save = (kind) => async (photo) => {
    setError(null);
    const result = await saveRestaurantPhoto(slug, kind, photo ? JSON.stringify(photo) : "");
    if (result.error) setError(result.error);
  };

  return (
    <section id="photos" className="flex scroll-mt-24 flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 font-bold">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("sectionLead")}</p>
      </div>
      <FormAlert error={error} />
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <PhotoField slug={slug} kind="cover" label={t("cover")} hint={t("coverHint")} initial={cover} onChange={save("cover")} />
        <PhotoField slug={slug} kind="logo" label={t("logo")} hint={t("logoHint")} initial={logo} onChange={save("logo")} />
      </div>
    </section>
  );
}
