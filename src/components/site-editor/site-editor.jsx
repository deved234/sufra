"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Modal } from "@/components/dashboard/menu/menu-dialogs";
import { FormAlert } from "@/components/form/field";
import BlockRenderer from "@/components/site/block-renderer";
import { historyReducer, initialHistory } from "@/lib/site/history";
import * as ops from "@/lib/site/ops";
import BlockInspector from "@/components/site-editor/block-inspector";
import BlockList from "@/components/site-editor/block-list";
import { useAutosave } from "@/components/site-editor/use-autosave";

const PANELS = ["blocks", "preview", "settings"];

// The editor: the page's blocks, the page itself as it will look, and the settings of the
// chosen block. Every change goes through the history, so all of it can be undone, and
// saves itself as a draft, which visitors don't see.
export default function SiteEditor({ slug, restaurant, themeStyle, initialBlocks, initialRev }) {
  const t = useTranslations("SiteBuilder");
  const [history, dispatch] = useReducer(historyReducer, initialBlocks, initialHistory);
  const [selectedId, setSelectedId] = useState(initialBlocks[0]?.id ?? null);
  // On a phone one panel shows at a time
  const [panel, setPanel] = useState("preview");
  const { blocks } = history;
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const save = useAutosave({ slug, blocks, initialRev });

  const apply = useCallback((next, group) => dispatch({ type: "apply", next, group }), []);

  const select = (id) => {
    setSelectedId(id);
    setPanel("settings");
  };
  const add = (type) => {
    const block = ops.createBlock(blocks, type);
    const at = selected ? blocks.indexOf(selected) + 1 : blocks.length;
    const next = ops.addBlock(blocks, block, at);
    if (next) {
      apply(next);
      select(block.id);
    }
  };
  const duplicate = (id) => {
    const next = ops.duplicateBlock(blocks, id);
    if (!next) return;
    apply(next);
    setSelectedId(next[blocks.findIndex((block) => block.id === id) + 1].id);
  };
  const remove = (id) => {
    const at = blocks.findIndex((block) => block.id === id);
    const next = ops.removeBlock(blocks, id);
    if (!next) return;
    apply(next);
    if (id === selectedId) setSelectedId(next[Math.min(at, next.length - 1)]?.id ?? null);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      } else if (key === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2">
        <Link href={`/dashboard/${slug}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          <span aria-hidden className="inline-block rtl:-scale-x-100">
            ←
          </span>{" "}
          {t("back")}
        </Link>
        {/* No room for it in a phone's header, so only screen readers get it there */}
        <h1 className="sr-only min-w-0 flex-1 truncate font-display font-bold sm:not-sr-only">{t("title", { name: restaurant.name })}</h1>
        <div className="flex-1 sm:hidden" />
        <SaveStatus save={save} />
        <div className="flex gap-1">
          <button type="button" disabled={history.past.length === 0} onClick={() => dispatch({ type: "undo" })} className="rounded-pill border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-40">
            {t("undo")}
          </button>
          <button type="button" disabled={history.future.length === 0} onClick={() => dispatch({ type: "redo" })} className="rounded-pill border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-40">
            {t("redo")}
          </button>
        </div>
      </header>

      <nav aria-label={t("panels")} className="grid grid-cols-3 border-b border-border bg-surface lg:hidden">
        {PANELS.map((name) => (
          <button key={name} type="button" aria-pressed={panel === name} onClick={() => setPanel(name)} className={`border-b-2 px-2 py-2.5 text-sm font-semibold ${panel === name ? "border-brand" : "border-transparent text-muted-foreground"}`}>
            {t(`panel.${name}`)}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside aria-label={t("panel.blocks")} className={`min-h-0 overflow-y-auto border-border bg-surface lg:block lg:border-e ${panel === "blocks" ? "" : "hidden"}`}>
          <BlockList blocks={blocks} selectedId={selectedId} onSelect={select} onMove={(id, to) => apply(ops.moveBlock(blocks, id, to))} onDuplicate={duplicate} onRemove={remove} onAdd={add} />
        </aside>

        <section aria-label={t("panel.preview")} className={`min-h-0 overflow-y-auto bg-surface-muted lg:block ${panel === "preview" ? "" : "hidden"}`}>
          {/* For looking only: its links lead away from the editor */}
          <div data-restaurant inert style={themeStyle} className="flex min-h-full flex-col bg-background">
            <BlockRenderer restaurant={restaurant} blocks={blocks} editing />
          </div>
        </section>

        <aside aria-label={t("panel.settings")} className={`min-h-0 overflow-y-auto border-border bg-surface lg:block lg:border-s ${panel === "settings" ? "" : "hidden"}`}>
          <BlockInspector
            block={selected}
            slug={slug}
            restaurant={restaurant}
            onVariant={(id, variant) => apply(ops.setVariant(blocks, id, variant))}
            onProp={(id, name, value, group) => apply(ops.setProp(blocks, id, name, value), group)}
            onFieldBlur={() => dispatch({ type: "endGroup" })}
          />
        </aside>
      </div>

      {save.conflict && (
        <Modal title={t("conflictTitle")} onClose={() => {}}>
          <p>{t("conflictBody")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => dispatch({ type: "replace", blocks: save.takeTheirs() })} className="rounded-pill bg-cta px-6 py-2.5 font-semibold text-on-cta hover:bg-cta-hover">
              {t("conflictTheirs")}
            </button>
            <button type="button" onClick={save.keepMine} className="rounded-pill border border-border-strong px-6 py-2.5 font-semibold hover:bg-surface-muted">
              {t("conflictMine")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SaveStatus({ save }) {
  const t = useTranslations("SiteBuilder");
  if (save.status === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <FormAlert error={save.error} />
        <button type="button" onClick={save.retry} className="rounded-pill border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted">
          {t("retrySave")}
        </button>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {t(`save.${save.status}`)}
    </p>
  );
}
