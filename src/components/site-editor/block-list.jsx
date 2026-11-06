"use client";

import { useTranslations } from "next-intl";
import { BLOCK_TYPES } from "@/lib/site/blocks";
import { canAdd, canRemove } from "@/lib/site/ops";

const SMALL = "flex size-8 items-center justify-center rounded-md text-sm hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-transparent";

// The page's blocks in order, to pick one and move it, and what can be added.
export default function BlockList({ blocks, selectedId, onSelect, onMove, onDuplicate, onRemove, onAdd }) {
  const t = useTranslations("SiteBuilder");
  const addable = BLOCK_TYPES.filter((type) => canAdd(blocks, type));

  return (
    <div className="flex flex-col gap-6 p-4">
      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">{t("pageBlocks")}</h2>
        <ol className="flex flex-col gap-1">
          {blocks.map((block, index) => {
            const name = t(`blocks.${block.type}`);
            const selected = block.id === selectedId;
            return (
              <li key={block.id} className={`flex items-center gap-1 rounded-md border ${selected ? "border-brand bg-brand-soft text-on-brand-soft" : "border-border bg-surface"}`}>
                <button type="button" aria-pressed={selected} onClick={() => onSelect(block.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-start text-sm font-semibold">
                  {name}
                </button>
                <button type="button" aria-label={t("moveUp", { name })} disabled={index === 0} onClick={() => onMove(block.id, index - 1)} className={SMALL}>
                  ↑
                </button>
                <button type="button" aria-label={t("moveDown", { name })} disabled={index === blocks.length - 1} onClick={() => onMove(block.id, index + 1)} className={SMALL}>
                  ↓
                </button>
                <button type="button" aria-label={t("duplicate", { name })} disabled={!canAdd(blocks, block.type)} onClick={() => onDuplicate(block.id)} className={SMALL}>
                  ⧉
                </button>
                <button type="button" aria-label={t("remove", { name })} disabled={!canRemove(block)} onClick={() => onRemove(block.id)} className={`${SMALL} text-danger`}>
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {addable.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display font-bold">{t("addBlock")}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {addable.map((type) => (
              <li key={type}>
                <button type="button" onClick={() => onAdd(type)} className="h-full w-full rounded-md border border-dashed border-border-strong px-2 py-2 text-sm font-medium hover:bg-surface-muted">
                  + {t(`blocks.${type}`)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
