"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DndContext, DragOverlay, MeasuringStrategy, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Modal } from "@/components/dashboard/menu/menu-dialogs";
import { FormAlert } from "@/components/form/field";
import { loadSiteVersion } from "@/lib/site/actions";
import { defaultBlocks, SITE_LIMITS } from "@/lib/site/blocks";
import { historyReducer, initialHistory } from "@/lib/site/history";
import * as ops from "@/lib/site/ops";
import { applyTemplate } from "@/lib/site/templates";
import BlockInspector from "@/components/site-editor/block-inspector";
import BlockList from "@/components/site-editor/block-list";
import PreviewPane from "@/components/site-editor/preview-pane";
import SiteOptions from "@/components/site-editor/site-options";
import { useAutosave } from "@/components/site-editor/use-autosave";

const PANELS = ["blocks", "preview", "settings"];
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

// Which half of the block under the pointer: that's the side a drop lands on
function dropSideOf({ activatorEvent, delta, over }) {
  const startY = activatorEvent.touches?.[0]?.clientY ?? activatorEvent.clientY;
  return startY + delta.y > over.rect.top + over.rect.height / 2 ? "after" : "before";
}

// The editor: the page's blocks, the page itself as it will look, and the settings of the
// chosen block. Every change goes through the history, so all of it can be undone, and
// saves itself as a draft, which visitors don't see until it's published.
export default function SiteEditor({ slug, locale, previews, themeStyle, initialBlocks, initialRev, publishedBlocks, initialVersion, initialVersions }) {
  const t = useTranslations("SiteBuilder");
  const [history, dispatch] = useReducer(historyReducer, initialBlocks, initialHistory);
  const [selectedId, setSelectedId] = useState(initialBlocks[0]?.id ?? null);
  // On a phone one panel shows at a time
  const [panel, setPanel] = useState("preview");
  // scheme null follows the site's own color mode, until it's chosen here
  const [view, setView] = useState({ device: "desktop", language: locale, scheme: null });
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragging = useRef(false);
  // What visitors see now. Compared by reference, like saving: undoing back to it, or
  // going back to it on purpose, leaves nothing to publish.
  const [live, setLive] = useState({ blocks: publishedBlocks ?? initialBlocks, version: initialVersion, versions: initialVersions });
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);
  const [missing, setMissing] = useState(null);
  const { blocks } = history;
  const hasChanges = blocks !== live.blocks;
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const restaurant = previews[locale].restaurant;
  const save = useAutosave({ slug, blocks, initialRev });
  // Pressing the bar's buttons, not dragging a few pixels by accident
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const apply = useCallback((next, group) => dispatch({ type: "apply", next, group }), []);

  const editBlock = (id) => {
    setSelectedId(id);
    setPanel("settings");
  };
  const insert = (type, at) => {
    const block = ops.createBlock(blocks, type);
    const next = ops.addBlock(blocks, block, at);
    if (!next) return null;
    apply(next);
    return block.id;
  };
  const add = (type) => {
    const id = insert(type, selected ? blocks.indexOf(selected) + 1 : blocks.length);
    if (id) editBlock(id);
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
  const move = (id, to) => apply(ops.moveBlock(blocks, id, to));

  // A whole other page: a template, a past version, the default. Still one step to undo.
  const replaceBlocks = (next) => {
    apply(next);
    if (!next.some((block) => block.id === selectedId)) setSelectedId(next[0]?.id ?? null);
  };
  const openVersion = async (version) => {
    if (version === live.version) {
      replaceBlocks(live.blocks);
      return null;
    }
    try {
      const result = await loadSiteVersion(slug, version);
      if (result.error) return result.error;
      replaceBlocks(result.blocks);
      return null;
    } catch {
      return "saveFailed";
    }
  };

  const publish = async () => {
    setPublishing(true);
    const result = await save.publish();
    setPublishing(false);
    if (result.missing) setMissing(result.missing);
    if (result.version) {
      setLive((current) => ({
        blocks: result.sent,
        version: result.version,
        versions: [{ version: result.version, publishedAt: result.publishedAt }, ...current.versions].slice(0, SITE_LIMITS.versions),
      }));
      setPublished({ visible: result.status === "published" });
    }
  };
  // To the field that needs filling, with the page shown in that field's language
  const goToMissing = ({ blockId, language }) => {
    setMissing(null);
    if (language) setView((current) => ({ ...current, language }));
    editBlock(blockId);
  };

  // ---- Dragging on the preview: a block by its handle, or a new one from the library.
  // Blocks are far too tall to slide around like list rows, so a small chip follows the
  // pointer, and a line shows where it would land.
  const onDragStart = ({ active }) => {
    dragging.current = true;
    const { kind, type, blockId } = active.data.current;
    setDrag({ name: t(`blocks.${kind === "library" ? type : blocks.find((block) => block.id === blockId).type}`) });
  };
  const trackDrop = (event) => {
    // A last move can arrive just after the drop, and must not bring the line back
    if (!dragging.current) return;
    const next = event.over ? { id: event.over.data.current.blockId, side: dropSideOf(event) } : null;
    setDropTarget((current) => (current?.id === next?.id && current?.side === next?.side ? current : next));
  };
  const endDrag = () => {
    dragging.current = false;
    setDrag(null);
    setDropTarget(null);
  };
  const onDragEnd = (event) => {
    endDrag();
    if (!event.over) return;
    const target = blocks.findIndex((block) => block.id === event.over.data.current.blockId) + (dropSideOf(event) === "after" ? 1 : 0);
    const { kind, type, blockId } = event.active.data.current;
    if (kind === "library") {
      const id = insert(type, target);
      if (id) setSelectedId(id);
    } else {
      const from = blocks.findIndex((block) => block.id === blockId);
      // Taking it out first moves everything after it up by one
      const to = target > from ? target - 1 : target;
      if (to !== from) move(blockId, to);
    }
  };

  // The bar on a block speaks the editor's language, even when the page shown is in the
  // other one. The words are made here, outside the preview's own language.
  const barWords = (block) => {
    const name = t(`blocks.${block.type}`);
    return {
      name,
      lang: locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      choose: t("chooseBlock", { name }),
      drag: t("dragBlock", { name }),
      up: t("moveUp", { name }),
      down: t("moveDown", { name }),
      copy: t("duplicate", { name }),
      remove: t("remove", { name }),
      edit: t("editBlock"),
    };
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
        <button type="button" disabled={!hasChanges || publishing || save.conflict} onClick={publish} className="rounded-pill bg-cta px-5 py-1.5 text-sm font-semibold text-on-cta hover:bg-cta-hover disabled:opacity-40">
          {publishing ? t("publishing") : t("publish")}
        </button>
      </header>

      <PublishStatus slug={slug} hasChanges={hasChanges} published={published} />

      <nav aria-label={t("panels")} className="grid grid-cols-3 border-b border-border bg-surface lg:hidden">
        {PANELS.map((name) => (
          <button key={name} type="button" aria-pressed={panel === name} onClick={() => setPanel(name)} className={`border-b-2 px-2 py-2.5 text-sm font-semibold ${panel === name ? "border-brand" : "border-transparent text-muted-foreground"}`}>
            {t(`panel.${name}`)}
          </button>
        ))}
      </nav>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} measuring={MEASURING} onDragStart={onDragStart} onDragMove={trackDrop} onDragOver={trackDrop} onDragEnd={onDragEnd} onDragCancel={endDrag}>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[19rem_minmax(0,1fr)_22rem]">
          <aside aria-label={t("panel.blocks")} className={`min-h-0 overflow-y-auto border-border bg-surface lg:block lg:border-e ${panel === "blocks" ? "" : "hidden"}`}>
            <BlockList blocks={blocks} selectedId={selectedId} onSelect={editBlock} onMove={move} onDuplicate={duplicate} onRemove={remove} onAdd={add} />
            <SiteOptions
              versions={live.versions}
              currentVersion={live.version}
              hasChanges={hasChanges}
              onTemplate={(name) => replaceBlocks(applyTemplate(name, blocks))}
              onDefault={() => replaceBlocks(defaultBlocks())}
              onDiscard={() => replaceBlocks(live.blocks)}
              onVersion={openVersion}
            />
          </aside>

          <section aria-label={t("panel.preview")} className={`min-h-0 lg:block ${panel === "preview" ? "" : "hidden"}`}>
            <PreviewPane
              blocks={blocks}
              previews={previews}
              themeStyle={themeStyle}
              view={view}
              onView={(change) => setView((current) => ({ ...current, ...change }))}
              selectedId={selectedId}
              dropTarget={dropTarget}
              barWords={barWords}
              onSelect={setSelectedId}
              onEdit={() => setPanel("settings")}
              onMove={move}
              onDuplicate={duplicate}
              onRemove={remove}
            />
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
        <DragOverlay dropAnimation={null}>{drag && <div className="w-fit rounded-pill bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg">{drag.name}</div>}</DragOverlay>
      </DndContext>

      {missing && (
        <Modal title={t("missingTitle")} onClose={() => setMissing(null)}>
          <p>{t("missingBody")}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {missing.map((item) => (
              <li key={`${item.blockId}-${item.field}-${item.language}`}>
                <button type="button" onClick={() => goToMissing(item)} className="w-full rounded-md border border-border px-4 py-2.5 text-start font-medium hover:bg-surface-muted">
                  {t("missingItem", { block: t(`blocks.${item.type}`), field: t(`fields.${item.field}`) })}
                  {item.language && <span className="ms-2 text-sm text-muted-foreground">({t(`language.${item.language}`)})</span>}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

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

// A line under the header, only when there's something to say: what isn't live yet, or
// that the publish worked. A restaurant visitors can't reach has no page to look at yet.
function PublishStatus({ slug, hasChanges, published }) {
  const t = useTranslations("SiteBuilder");
  if (!hasChanges && !published) return null;
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-3 border-b border-border bg-surface-muted px-4 py-1.5 text-sm">
      {hasChanges ? (
        t("unpublished")
      ) : published.visible ? (
        <>
          {t("published")}
          <Link href={`/r/${slug}`} target="_blank" className="font-semibold text-brand-text hover:underline">
            {t("viewLive")}
          </Link>
        </>
      ) : (
        t("publishedHidden")
      )}
    </p>
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
