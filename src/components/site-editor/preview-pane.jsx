"use client";

import { useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import BlockRenderer from "@/components/site/block-renderer";
import { canAdd, canRemove } from "@/lib/site/ops";
import { useReducedMotion, useSiteTheme } from "@/components/site-editor/use-preferences";

// Widths of the page shown. Blocks size themselves with container queries, so this is
// all it takes to see a real phone layout on a computer.
const DEVICES = { desktop: null, tablet: 768, phone: 390 };

function Segmented({ label, options, value, onChange, className = "" }) {
  return (
    <div role="group" aria-label={label} className={`flex rounded-pill border border-border-strong bg-surface p-0.5 ${className}`}>
      {options.map(([option, text]) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`rounded-pill px-3 py-1 text-xs font-semibold ${value === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

// The page as it will look, in any size, language and color mode, whatever the editor's
// own are. Messages and restaurant come per language, since a block reads both.
export default function PreviewPane({ blocks, previews, themeStyle, view, onView, selectedId, dropTarget, barWords, onSelect, onEdit, onMove, onDuplicate, onRemove }) {
  const t = useTranslations("SiteBuilder");
  const siteTheme = useSiteTheme();
  const reduced = useReducedMotion();
  const { device, language, scheme } = view;
  const { restaurant, messages } = previews[language];
  const shownScheme = scheme ?? siteTheme;

  // Bring the chosen block into view, unless it's already showing
  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-frame="${selectedId}"]`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [selectedId, reduced]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Segmented
          label={t("previewSize")}
          className="hidden sm:flex"
          value={device}
          onChange={(value) => onView({ device: value })}
          options={Object.keys(DEVICES).map((name) => [name, t(`device.${name}`)])}
        />
        <Segmented label={t("previewLanguage")} value={language} onChange={(value) => onView({ language: value })} options={[["ar", "عربي"], ["en", "English"]]} />
        <Segmented label={t("previewMode")} value={shownScheme} onChange={(value) => onView({ scheme: value })} options={[["light", t("mode.light")], ["dark", t("mode.dark")]]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div data-preview-page data-theme={shownScheme} lang={language} dir={language === "ar" ? "rtl" : "ltr"} style={{ maxWidth: DEVICES[device] ?? undefined }} className={`mx-auto bg-background text-foreground ${device === "desktop" ? "" : "shadow-md"}`}>
          <div data-restaurant style={themeStyle} className="flex min-h-full flex-col">
            <NextIntlClientProvider locale={language} messages={messages} timeZone="Asia/Riyadh">
              <BlockRenderer
                restaurant={restaurant}
                blocks={blocks}
                editing
                frame={(block, element) => (
                  <BlockFrame
                    block={block}
                    index={blocks.indexOf(block)}
                    total={blocks.length}
                    canCopy={canAdd(blocks, block.type)}
                    selected={block.id === selectedId}
                    dropSide={dropTarget?.id === block.id ? dropTarget.side : null}
                    words={barWords(block)}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onMove={onMove}
                    onDuplicate={onDuplicate}
                    onRemove={onRemove}
                  >
                    {element}
                  </BlockFrame>
                )}
              />
            </NextIntlClientProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

// One block on the page: its content is for looking at only, and over it sits a layer to
// choose it, a bar of controls once chosen, and a line showing where a drop would land.
// The bar speaks the editor's language, not the page's, so its words come from outside.
function BlockFrame({ block, index, total, canCopy, selected, dropSide, words, onSelect, onEdit, onMove, onDuplicate, onRemove, children }) {
  const { setNodeRef: dropRef } = useDroppable({ id: `frame:${block.id}`, data: { blockId: block.id } });
  const { attributes, listeners, setNodeRef: dragRef, setActivatorNodeRef, isDragging } = useDraggable({ id: `move:${block.id}`, data: { kind: "move", blockId: block.id } });

  return (
    <div
      ref={(node) => {
        dropRef(node);
        dragRef(node);
      }}
      data-frame={block.id}
      className={`relative min-h-10 ${isDragging ? "opacity-40" : ""}`}
    >
      <div inert>{children}</div>
      <button
        type="button"
        aria-label={words.choose}
        aria-pressed={selected}
        onClick={() => onSelect(block.id)}
        className={`absolute inset-0 z-20 outline-offset-[-2px] hover:outline-2 hover:outline-brand/60 focus-visible:outline-2 focus-visible:outline-brand ${selected ? "outline-2 outline-brand" : ""}`}
      />
      {selected && (
        <div dir={words.dir} lang={words.lang} className="absolute end-2 top-2 z-30 flex items-center gap-0.5 rounded-pill border border-border bg-surface p-1 text-foreground shadow-md">
          <button ref={setActivatorNodeRef} type="button" aria-label={words.drag} {...attributes} {...listeners} className="flex size-8 cursor-grab touch-none items-center justify-center rounded-pill hover:bg-surface-muted active:cursor-grabbing">
            <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
              <circle cx="6" cy="4" r="1.3" />
              <circle cx="10" cy="4" r="1.3" />
              <circle cx="6" cy="8" r="1.3" />
              <circle cx="10" cy="8" r="1.3" />
              <circle cx="6" cy="12" r="1.3" />
              <circle cx="10" cy="12" r="1.3" />
            </svg>
          </button>
          <span className="px-1 text-xs font-semibold">{words.name}</span>
          <button type="button" aria-label={words.up} disabled={index === 0} onClick={() => onMove(block.id, index - 1)} className="flex size-8 items-center justify-center rounded-pill text-sm hover:bg-surface-muted disabled:opacity-30">
            ↑
          </button>
          <button type="button" aria-label={words.down} disabled={index === total - 1} onClick={() => onMove(block.id, index + 1)} className="flex size-8 items-center justify-center rounded-pill text-sm hover:bg-surface-muted disabled:opacity-30">
            ↓
          </button>
          <button type="button" aria-label={words.copy} disabled={!canCopy} onClick={() => onDuplicate(block.id)} className="flex size-8 items-center justify-center rounded-pill text-sm hover:bg-surface-muted disabled:opacity-30">
            ⧉
          </button>
          <button type="button" aria-label={words.remove} disabled={!canRemove(block)} onClick={() => onRemove(block.id)} className="flex size-8 items-center justify-center rounded-pill text-sm text-danger hover:bg-surface-muted disabled:opacity-30">
            ✕
          </button>
          <button type="button" onClick={onEdit} className="rounded-pill px-2 py-1 text-xs font-semibold hover:bg-surface-muted lg:hidden">
            {words.edit}
          </button>
        </div>
      )}
      {dropSide && <div aria-hidden className={`absolute inset-x-0 z-40 h-1 bg-brand ${dropSide === "before" ? "-top-0.5" : "-bottom-0.5"}`} />}
    </div>
  );
}
