"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FormAlert } from "@/components/form/field";
import { TEMPLATE_NAMES } from "@/lib/site/templates";

const BUTTON = "w-full rounded-md border border-border px-3 py-2 text-start text-sm font-semibold hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent";

// Whole-page changes, under the list of blocks. All of them go through the history like
// any edit, so each one can be undone, and none reaches visitors until it's published.
export default function SiteOptions({ versions, currentVersion, hasChanges, onTemplate, onDefault, onDiscard, onVersion }) {
  const t = useTranslations("SiteBuilder");
  const locale = useLocale();
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(null);
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });

  const open = async (version) => {
    setError(null);
    setOpening(version);
    setError(await onVersion(version));
    setOpening(null);
  };

  return (
    <div className="flex flex-col gap-6 border-t border-border p-4">
      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">{t("templates")}</h2>
        <p className="text-xs text-muted-foreground">{t("templatesHint")}</p>
        <ul className="flex flex-col gap-2">
          {TEMPLATE_NAMES.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => onTemplate(name)} className={BUTTON}>
                {t(`template.${name}.name`)}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{t(`template.${name}.about`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">{t("goBack")}</h2>
        <button type="button" disabled={!hasChanges} onClick={onDiscard} className={BUTTON}>
          {t("discard")}
        </button>
        <button type="button" onClick={onDefault} className={BUTTON}>
          {t("useDefault")}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">{t("versions")}</h2>
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noVersions")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {versions.map(({ version, publishedAt }) => (
              <li key={version} className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{t("versionNumber", { version })}</span>
                  {version === currentVersion && <span className="ms-2 rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-semibold">{t("versionLive")}</span>}
                  <span className="block text-xs text-muted-foreground">{format.format(new Date(publishedAt))}</span>
                </span>
                <button
                  type="button"
                  disabled={opening !== null}
                  onClick={() => open(version)}
                  aria-label={t("openVersionLabel", { version })}
                  className="shrink-0 rounded-pill border border-border-strong px-3 py-1 text-xs font-semibold hover:bg-surface-muted disabled:opacity-40"
                >
                  {t("openVersion")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <FormAlert error={error} />}
      </section>
    </div>
  );
}
