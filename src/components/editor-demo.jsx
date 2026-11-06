"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import gsap from "gsap";
import { useLocale, useTranslations } from "next-intl";
import BlockRenderer from "@/components/site/block-renderer";
import BlockList from "@/components/site-editor/block-list";
import { Segmented } from "@/components/site-editor/preview-pane";
import { useReducedMotion, useSiteTheme } from "@/components/site-editor/use-preferences";
import { applyDemoTemplate, demoBlock, demoBlocks, DEMO_BLOCK_TYPES, demoVariants } from "@/lib/site/demo";
import { historyReducer, initialHistory } from "@/lib/site/history";
import { addBlock, duplicateBlock, moveBlock, removeBlock, setVariant } from "@/lib/site/ops";
import { TEMPLATE_NAMES } from "@/lib/site/templates";

const DEVICES = { desktop: null, phone: 390 };
const PILL = "rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors duration-150";
const QUIET = "border-border-strong bg-surface hover:bg-surface-muted";

// The site editor's parts, working on a sample restaurant in the visitor's own browser:
// the same block list, edits, undo and BlockRenderer an owner gets. Nothing is sent
// anywhere. The first page is in the HTML, so it's there before any script runs.
export default function EditorDemo({ restaurant, themes }) {
  const t = useTranslations("EditorDemo");
  const site = useTranslations("SiteBuilder");
  const locale = useLocale();
  const reduced = useReducedMotion();
  const siteTheme = useSiteTheme();

  const [history, dispatch] = useReducer(historyReducer, demoBlocks(), initialHistory);
  const { blocks, past, future } = history;
  const [selectedId, setSelectedId] = useState("menu-1");
  const [changedId, setChangedId] = useState(null);
  const [device, setDevice] = useState("desktop");
  const [scheme, setScheme] = useState(null);
  const [accent, setAccent] = useState(Object.keys(themes)[0]);
  const pane = useRef(null);

  const selected = blocks.find((block) => block.id === selectedId);
  const looks = selected ? demoVariants(selected.type) : [];
  const shownScheme = scheme ?? siteTheme;

  const edit = (next, id = selectedId) => {
    if (!next) return;
    dispatch({ type: "apply", next });
    setSelectedId(id);
    setChangedId({ id });
  };

  // Show what just changed, within the preview only: scrolling the page itself would
  // pull the controls away from under the visitor's hand
  useEffect(() => {
    if (!changedId) return;
    const frame = pane.current?.querySelector(`[data-frame="${changedId.id}"]`);
    if (!frame) return;
    const top = frame.getBoundingClientRect().top - pane.current.getBoundingClientRect().top + pane.current.scrollTop;
    pane.current.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    if (reduced) return;
    const tween = gsap.fromTo(frame, { opacity: 0.35, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "opacity,transform" });
    return () => tween.kill();
  }, [changedId, reduced]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-md lg:grid lg:h-[46rem] lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col border-b border-border lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-e">
        <section className="flex flex-col gap-2 px-4 pt-4">
          <h3 className="font-display font-bold">{site("templates")}</h3>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_NAMES.map((name) => (
              <button key={name} type="button" onClick={() => edit(applyDemoTemplate(name, blocks), "hero-1")} className={`${PILL} ${QUIET}`}>
                {site(`template.${name}.name`)}
              </button>
            ))}
          </div>
        </section>

        {looks.length > 1 && (
          <section className="flex flex-col gap-2 px-4 pt-5">
            <h3 className="font-display font-bold">
              {site("look")}: {site(`blocks.${selected.type}`)}
            </h3>
            <div role="group" aria-label={site("look")} className="flex flex-wrap gap-2">
              {looks.map((look) => (
                <button key={look} type="button" aria-pressed={selected.variant === look} onClick={() => edit(setVariant(blocks, selected.id, look))} className={`${PILL} ${selected.variant === look ? "border-brand bg-brand-soft text-on-brand-soft" : QUIET}`}>
                  {site(`variants.${selected.type}.${look}`)}
                </button>
              ))}
            </div>
          </section>
        )}

        <BlockList
          dndId="editor-demo"
          blocks={blocks}
          selectedId={selectedId}
          types={DEMO_BLOCK_TYPES}
          addHint={t("addHint")}
          onSelect={(id) => {
            setSelectedId(id);
            setChangedId({ id });
          }}
          onMove={(id, index) => edit(moveBlock(blocks, id, index), id)}
          onDuplicate={(id) => edit(duplicateBlock(blocks, id), id)}
          onRemove={(id) => edit(removeBlock(blocks, id), null)}
          onAdd={(type) => {
            const block = type === "announcement" && blocks.some((item) => item.type === type) ? { ...demoBlock(type), id: `${type}-${blocks.length + 1}` } : demoBlock(type);
            edit(addBlock(blocks, block), block.id);
          }}
        />
      </div>

      <div className="flex h-[36rem] min-w-0 flex-col lg:h-full">
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border px-3 py-2">
          <Segmented label={site("previewSize")} className="hidden sm:flex" value={device} onChange={setDevice} options={Object.keys(DEVICES).map((name) => [name, site(`device.${name}`)])} />
          <Segmented label={site("previewMode")} value={shownScheme} onChange={setScheme} options={[["light", site("mode.light")], ["dark", site("mode.dark")]]} />
          <div role="group" aria-label={t("color")} className="flex items-center gap-1.5">
            {Object.entries(themes).map(([name, { accent: color }]) => (
              <button
                key={name}
                type="button"
                aria-label={t(`colors.${name}`)}
                aria-pressed={accent === name}
                onClick={() => setAccent(name)}
                style={{ backgroundColor: color }}
                className={`size-6 rounded-pill border-2 ${accent === name ? "border-foreground" : "border-transparent"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={past.length === 0} onClick={() => dispatch({ type: "undo" })} className="rounded-pill px-2 py-1 text-xs font-semibold hover:bg-surface-muted disabled:opacity-30">
              {site("undo")}
            </button>
            <button type="button" disabled={future.length === 0} onClick={() => dispatch({ type: "redo" })} className="rounded-pill px-2 py-1 text-xs font-semibold hover:bg-surface-muted disabled:opacity-30">
              {site("redo")}
            </button>
            <button type="button" disabled={past.length === 0} onClick={() => dispatch({ type: "replace", blocks: demoBlocks() })} className="rounded-pill px-2 py-1 text-xs font-semibold hover:bg-surface-muted disabled:opacity-30">
              {t("reset")}
            </button>
          </div>
        </div>

        <div ref={pane} tabIndex={0} role="region" aria-label={t("preview")} className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
          <div data-preview-page data-theme={shownScheme} lang={locale} style={{ maxWidth: DEVICES[device] ?? undefined }} className={`mx-auto bg-background text-foreground ${device === "desktop" ? "" : "shadow-md"}`}>
            <div data-restaurant style={themes[accent].style} className="flex min-h-full flex-col">
              <BlockRenderer
                restaurant={restaurant}
                blocks={blocks}
                editing
                frame={(block, element) => (
                  <div data-frame={block.id} className="relative min-h-10">
                    <div inert>{element}</div>
                    <button
                      type="button"
                      aria-label={site("chooseBlock", { name: site(`blocks.${block.type}`) })}
                      aria-pressed={block.id === selectedId}
                      onClick={() => setSelectedId(block.id)}
                      className={`absolute inset-0 z-20 outline-offset-[-2px] hover:outline-2 hover:outline-brand/60 focus-visible:outline-2 focus-visible:outline-brand ${block.id === selectedId ? "outline-2 outline-brand" : ""}`}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
