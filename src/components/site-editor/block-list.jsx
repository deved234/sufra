"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { BLOCK_TYPES } from "@/lib/site/blocks";
import { canAdd, canRemove } from "@/lib/site/ops";
import { useReducedMotion } from "@/components/site-editor/use-preferences";

const SMALL = "flex size-8 shrink-0 items-center justify-center rounded-md text-sm hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-transparent";

// The page's blocks in order, to pick one and move it. This list is the dependable way to
// reorder: every row is the same size, and it works by keyboard. It has its own drag
// context, apart from the one that drags blocks around the preview.
export default function BlockList({ blocks, selectedId, onSelect, onMove, onDuplicate, onRemove, onAdd }) {
  const t = useTranslations("SiteBuilder");
  const addable = BLOCK_TYPES.filter((type) => canAdd(blocks, type));
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so clicks still work
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id) => t(`blocks.${blocks.find((block) => block.id === id)?.type}`);
  const place = (id) => ({ position: blocks.findIndex((block) => block.id === id) + 1, total: blocks.length });
  const accessibility = {
    screenReaderInstructions: { draggable: t("dnd.instructions") },
    announcements: {
      onDragStart: ({ active }) => t("dnd.start", { name: nameOf(active.id) }),
      onDragOver: ({ active, over }) => (over ? t("dnd.over", { name: nameOf(active.id), ...place(over.id) }) : undefined),
      onDragEnd: ({ active, over }) => (over ? t("dnd.end", { name: nameOf(active.id), ...place(over.id) }) : undefined),
      onDragCancel: ({ active }) => t("dnd.cancel", { name: nameOf(active.id) }),
    },
  };

  const onDragEnd = ({ active, over }) => {
    if (over && over.id !== active.id) onMove(active.id, blocks.findIndex((block) => block.id === over.id));
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">{t("pageBlocks")}</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={accessibility} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-1">
              {blocks.map((block, index) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  last={index === blocks.length - 1}
                  selected={block.id === selectedId}
                  canCopy={canAdd(blocks, block.type)}
                  onSelect={onSelect}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </section>

      {addable.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display font-bold">{t("addBlock")}</h2>
          <p className="text-xs text-muted-foreground">{t("addHint")}</p>
          <ul className="grid grid-cols-2 gap-2">
            {addable.map((type) => (
              <LibraryItem key={type} type={type} onAdd={onAdd} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BlockRow({ block, index, last, selected, canCopy, onSelect, onMove, onDuplicate, onRemove }) {
  const t = useTranslations("SiteBuilder");
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const name = t(`blocks.${block.type}`);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition: reduced ? undefined : transition }}
      className={`flex items-center rounded-md border ${isDragging ? "relative z-10 shadow-md" : ""} ${selected ? "border-brand bg-brand-soft text-on-brand-soft" : "border-border bg-surface"}`}
    >
      <button ref={setActivatorNodeRef} type="button" aria-label={t("dragBlock", { name })} {...attributes} {...listeners} className={`${SMALL} cursor-grab touch-none active:cursor-grabbing`}>
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
          <circle cx="6" cy="4" r="1.3" />
          <circle cx="10" cy="4" r="1.3" />
          <circle cx="6" cy="8" r="1.3" />
          <circle cx="10" cy="8" r="1.3" />
          <circle cx="6" cy="12" r="1.3" />
          <circle cx="10" cy="12" r="1.3" />
        </svg>
      </button>
      <button type="button" aria-pressed={selected} onClick={() => onSelect(block.id)} className="min-w-0 flex-1 truncate px-2 py-2 text-start text-sm font-semibold">
        {name}
      </button>
      <button type="button" aria-label={t("moveUp", { name })} disabled={index === 0} onClick={() => onMove(block.id, index - 1)} className={SMALL}>
        ↑
      </button>
      <button type="button" aria-label={t("moveDown", { name })} disabled={last} onClick={() => onMove(block.id, index + 1)} className={SMALL}>
        ↓
      </button>
      <button type="button" aria-label={t("duplicate", { name })} disabled={!canCopy} onClick={() => onDuplicate(block.id)} className={SMALL}>
        ⧉
      </button>
      <button type="button" aria-label={t("remove", { name })} disabled={!canRemove(block)} onClick={() => onRemove(block.id)} className={`${SMALL} text-danger`}>
        ✕
      </button>
    </li>
  );
}

// Press to add, or drag onto the preview to choose the spot. This one belongs to the
// editor's outer drag context, so the preview can receive it.
function LibraryItem({ type, onAdd }) {
  const t = useTranslations("SiteBuilder");
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: `library:${type}`, data: { kind: "library", type } });
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        onClick={() => onAdd(type)}
        className={`h-full w-full cursor-grab rounded-md border border-dashed border-border-strong px-2 py-2 text-sm font-medium hover:bg-surface-muted ${isDragging ? "opacity-40" : ""}`}
      >
        + {t(`blocks.${type}`)}
      </button>
    </li>
  );
}
