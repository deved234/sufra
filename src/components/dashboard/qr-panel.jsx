"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const PNG_SIZE = 1024;

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// The same drawing as the SVG, onto a canvas: PNG for anything that won't take an SVG
async function savePng(svg, filename) {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = PNG_SIZE;
  canvas.height = PNG_SIZE;
  const context = canvas.getContext("2d");
  // Blurring the edges would make it harder to scan
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
  canvas.toBlob((blob) => save(blob, filename), "image/png");
}

// The code for a restaurant's site, to download or print as a card for the table
export default function QrPanel({ slug, name, color, published, codes }) {
  const t = useTranslations("Qr");
  const locale = useLocale();
  const [language, setLanguage] = useState(locale);
  const code = codes[language];
  const filename = `sufra-${slug}-${language}`;

  return (
    <div className="flex flex-col gap-6">
      {!published && (
        <p role="status" className="rounded-md bg-brand-soft p-4 text-sm font-semibold text-on-brand-soft">
          {t("notPublished")}
        </p>
      )}

      <div className="grid items-start gap-8 md:grid-cols-[auto_1fr]">
        {/* What gets printed: the rest of the page hides, see globals.css. Always white:
            a code on a dark background is hard to scan. */}
        <div id="qr-card" className="flex w-full max-w-xs flex-col items-center gap-3 rounded-lg border border-border bg-white p-6 text-center text-[#111111]">
          <p lang={language} className="font-display text-h3 font-extrabold">
            {name[language]}
          </p>
          <svg viewBox={`0 0 ${code.view} ${code.view}`} shapeRendering="crispEdges" role="img" aria-label={t("codeLabel", { url: code.url })} className="w-full">
            <rect width={code.view} height={code.view} fill="#ffffff" />
            <path fill={color} d={code.path} />
          </svg>
          <p lang={language} className="font-semibold">
            {t(language === "ar" ? "scanAr" : "scanEn")}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-h3 font-bold">{t("title")}</h2>
            <p className="max-w-lg text-muted-foreground">{t("lead")}</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("language")}</legend>
            <div className="flex flex-wrap gap-4">
              {["ar", "en"].map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="qr-language" checked={language === value} onChange={() => setLanguage(value)} className="size-4 accent-brand" />
                  {t(value === "ar" ? "languageAr" : "languageEn")}
                </label>
              ))}
            </div>
          </fieldset>

          <p dir="ltr" className="break-all rounded-md bg-surface-muted px-3 py-2 text-start text-sm">
            {code.url}
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => savePng(code.svg, `${filename}.png`)} className="rounded-pill bg-cta px-5 py-2.5 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
              {t("downloadPng")}
            </button>
            <button type="button" onClick={() => save(new Blob([code.svg], { type: "image/svg+xml" }), `${filename}.svg`)} className="rounded-pill border border-border-strong px-5 py-2.5 font-semibold hover:bg-surface-muted">
              {t("downloadSvg")}
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-pill border border-border-strong px-5 py-2.5 font-semibold hover:bg-surface-muted">
              {t("print")}
            </button>
          </div>
          <p className="max-w-lg text-sm text-muted-foreground">{t("testFirst")}</p>
        </div>
      </div>
    </div>
  );
}
