"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as ops from "@/lib/menu-ops";
import * as actions from "@/lib/dashboard/menu-actions";
import { formatPrice } from "@/lib/format";
import { CategoryForm, ConfirmDialog, DishForm, Modal } from "@/components/dashboard/menu/menu-dialogs";
import { Toasts, useToasts } from "@/components/dashboard/menu/toasts";

// Drag ids are prefixed so a section and a dish can never collide
const catKey = (id) => `c:${id}`;
const dishKey = (id) => `d:${id}`;
const rawId = (key) => key.slice(2);

// The menu as the owner sees it while editing. Every change shows at once through
// useOptimistic, while the Server Action saves it; when the server answers, the
// page refreshes with the stored menu and the optimistic copy is dropped. If the
// save fails, the optimistic copy is dropped too, so the screen falls back by itself.
export default function MenuEditor({ slug, menu }) {
  const t = useTranslations("MenuEditor");
  const errorsT = useTranslations("Form.errors");
  const locale = useLocale();
  const [optimisticMenu, setOptimisticMenu] = useOptimistic(menu, (_current, next) => next);
  const [, startTransition] = useTransition();
  const { toasts, toast } = useToasts();
  const [dialog, setDialog] = useState(null);
  // While dragging a dish across sections, the preview lives here until the drop
  const [dragMenu, setDragMenu] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const view = dragMenu ?? optimisticMenu;
  // Screen reader messages are built outside rendering, from the latest menu
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });

  const name = (item) => item.name[locale];
  const closeDialog = useCallback(() => setDialog(null), []);

  function commit(next, save, success) {
    if (!next) return;
    startTransition(async () => {
      setOptimisticMenu(next);
      let result;
      try {
        result = await save();
      } catch {
        // Network failure: the request never got an answer
        result = { error: "generic" };
      }
      if (result?.error) toast(t("failed", { reason: errorsT(result.error) }), "error");
      else if (success) toast(success);
    });
  }

  // --- Drag and drop -------------------------------------------------------

  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so taps and clicks still work
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Sections only land on sections; dishes land on dishes or on an empty section
  const collisionDetection = useCallback((args) => {
    const type = args.active.data.current?.type;
    const droppableContainers = args.droppableContainers.filter((container) =>
      type === "category" ? container.data.current?.type === "category" : container.data.current?.type !== "category",
    );
    return closestCenter({ ...args, droppableContainers });
  }, []);

  function onDragStart({ active }) {
    setActiveKey(active.id);
    setDragMenu(optimisticMenu);
  }

  function onDragOver({ active, over }) {
    if (active.data.current?.type !== "dish" || !over) return;
    const dishId = rawId(active.id);
    setDragMenu((current) => {
      const from = ops.findDish(current, dishId)?.category.id;
      const to = over.data.current?.categoryId;
      if (!from || !to || from === to) return current;
      const target = current.find((category) => category.id === to);
      const overIndex = over.data.current.type === "dish" ? target.items.findIndex((item) => item.id === rawId(over.id)) : -1;
      return ops.moveDish(current, dishId, to, overIndex === -1 ? target.items.length : overIndex) ?? current;
    });
  }

  function onDragEnd({ active, over }) {
    const base = dragMenu ?? optimisticMenu;
    setDragMenu(null);
    setActiveKey(null);
    if (!over) return;

    if (active.data.current?.type === "category") {
      const ids = base.map((category) => category.id);
      const from = ids.indexOf(rawId(active.id));
      const to = ids.indexOf(rawId(over.id));
      if (from === -1 || to === -1 || from === to) return;
      const order = arrayMove(ids, from, to);
      commit(ops.reorderCategories(optimisticMenu, order), () => actions.reorderCategories(slug, order));
      return;
    }

    const dishId = rawId(active.id);
    const found = ops.findDish(base, dishId);
    if (!found) return;
    const items = found.category.items;
    let index = items.findIndex((item) => item.id === dishId);
    if (over.data.current?.type === "dish" && over.data.current.categoryId === found.category.id) {
      const overIndex = items.findIndex((item) => item.id === rawId(over.id));
      if (overIndex !== -1) index = overIndex;
    }
    const before = ops.findDish(optimisticMenu, dishId);
    const beforeIndex = before.category.items.findIndex((item) => item.id === dishId);
    if (before.category.id === found.category.id && beforeIndex === index) return;
    commit(ops.moveDish(optimisticMenu, dishId, found.category.id, index), () =>
      actions.moveDish(slug, dishId, found.category.id, index),
    );
  }

  function onDragCancel() {
    setDragMenu(null);
    setActiveKey(null);
  }

  // What screen readers hear while dragging, in the page language
  const describe = (key) => {
    const current = viewRef.current;
    if (key.startsWith("c:")) {
      const index = current.findIndex((category) => category.id === rawId(key));
      return { name: index === -1 ? "" : name(current[index]), position: index + 1, total: current.length };
    }
    const found = ops.findDish(current, rawId(key));
    if (!found) return { name: "", position: 0, total: 0 };
    const index = found.category.items.findIndex((item) => item.id === rawId(key));
    return { name: name(found.dish), position: index + 1, total: found.category.items.length };
  };
  // The position is where the item would land: the spot it's over, not where it started
  const landing = (active, over) => {
    const { name: activeName } = describe(active.id);
    if (over.data.current?.type === "container") return { name: activeName, position: 1, total: 1 };
    const { position, total } = describe(over.id);
    return { name: activeName, position, total };
  };
  const accessibility = {
    screenReaderInstructions: { draggable: t("dnd.instructions") },
    announcements: {
      onDragStart: ({ active }) => t("dnd.start", { name: describe(active.id).name }),
      onDragOver: ({ active, over }) => (over ? t("dnd.over", landing(active, over)) : undefined),
      onDragEnd: ({ active, over }) => (over ? t("dnd.end", landing(active, over)) : undefined),
      onDragCancel: ({ active }) => t("dnd.cancel", { name: describe(active.id).name }),
    },
  };

  // --- Actions on one item ---------------------------------------------------

  const toggleAvailable = (dish) => {
    const available = dish.available === false;
    commit(
      ops.setDishAvailable(optimisticMenu, dish.id, available),
      () => actions.setDishAvailable(slug, dish.id, available),
      t(available ? "availableOn" : "availableOff", { name: name(dish) }),
    );
  };

  const confirmDeleteDish = (dish) =>
    setDialog({
      kind: "confirm",
      title: t("deleteDish"),
      message: t("confirmDish", { name: name(dish) }),
      onConfirm: () => {
        setDialog(null);
        commit(ops.removeDish(optimisticMenu, dish.id), () => actions.deleteDish(slug, dish.id), t("deleted"));
      },
    });

  const confirmDeleteCategory = (category) =>
    setDialog({
      kind: "confirm",
      title: t("deleteCategory"),
      message: t("confirmCategory", { name: name(category), count: category.items.length }),
      onConfirm: () => {
        setDialog(null);
        commit(ops.removeCategory(optimisticMenu, category.id), () => actions.deleteCategory(slug, category.id), t("deleted"));
      },
    });

  const openDish = (category, dish) =>
    setDialog({
      kind: "dish",
      title: dish ? t("editDish") : t("newDish"),
      action: dish ? actions.updateDish.bind(null, slug, dish.id) : actions.createDish.bind(null, slug),
      initial: dish
        ? {
            name: dish.name,
            description: dish.description,
            price: String(dish.priceHalalas / 100),
            badge: dish.badge ?? "",
            tags: dish.tags,
            available: dish.available !== false,
            categoryId: category.id,
          }
        : { name: { ar: "", en: "" }, description: { ar: "", en: "" }, price: "", badge: "", tags: [], available: true, categoryId: category.id },
    });

  const activeDish = activeKey?.startsWith("d:") ? ops.findDish(view, rawId(activeKey))?.dish : null;
  const activeCategory = activeKey?.startsWith("c:") ? view.find((category) => category.id === rawId(activeKey)) : null;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t("lead")}</p>

      {view.length === 0 && (
        <p className="rounded-lg border border-dashed border-border-strong bg-surface p-6 text-muted-foreground">{t("empty")}</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={accessibility}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={view.map((category) => catKey(category.id))} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-5">
            {view.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                name={name}
                onEdit={() =>
                  setDialog({
                    kind: "category",
                    title: t("editCategory"),
                    action: actions.updateCategory.bind(null, slug, category.id),
                    initial: { name: category.name },
                  })
                }
                onDelete={() => confirmDeleteCategory(category)}
                onAddDish={() => openDish(category)}
              >
                {category.items.map((dish) => (
                  <DishRow
                    key={dish.id}
                    dish={dish}
                    categoryId={category.id}
                    name={name}
                    onToggle={() => toggleAvailable(dish)}
                    onEdit={() => openDish(category, dish)}
                    onDelete={() => confirmDeleteDish(dish)}
                  />
                ))}
              </CategoryCard>
            ))}
          </ol>
        </SortableContext>

        {/* What follows the pointer while dragging */}
        <DragOverlay>
          {activeDish && <DishRowContent dish={activeDish} name={name} overlay />}
          {activeCategory && (
            <div className="rounded-lg border border-border bg-surface px-5 py-4 font-display text-h3 font-bold shadow-lg">{name(activeCategory)}</div>
          )}
        </DragOverlay>
      </DndContext>

      <button
        type="button"
        onClick={() => setDialog({ kind: "category", title: t("addCategory"), action: actions.createCategory.bind(null, slug), initial: null })}
        className="self-start rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
      >
        {t("addCategory")}
      </button>

      {dialog?.kind === "confirm" && (
        <ConfirmDialog title={dialog.title} message={dialog.message} onConfirm={dialog.onConfirm} onClose={closeDialog} />
      )}
      {dialog?.kind === "category" && (
        <Modal title={dialog.title} onClose={closeDialog}>
          <CategoryForm action={dialog.action} initial={dialog.initial} onDone={closeDialog} />
        </Modal>
      )}
      {dialog?.kind === "dish" && (
        <Modal title={dialog.title} onClose={closeDialog}>
          <DishForm action={dialog.action} initial={dialog.initial} categories={view} locale={locale} onDone={closeDialog} />
        </Modal>
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}

function DragHandle({ label, listeners, attributes, setActivatorNodeRef }) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={label}
      {...attributes}
      {...listeners}
      // touch-none: on phones the finger drags the item instead of scrolling the page
      className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted active:cursor-grabbing"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
      </svg>
    </button>
  );
}

const smallButton = "rounded-pill px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted";

function CategoryCard({ category, name, onEdit, onDelete, onAddDish, children }) {
  const t = useTranslations("MenuEditor");
  const menuT = useTranslations("Menu");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: catKey(category.id),
    data: { type: "category" },
  });
  // An empty section still needs somewhere to drop a dish
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${category.id}`,
    data: { type: "container", categoryId: category.id },
    disabled: category.items.length > 0,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg border border-border bg-surface shadow-sm ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
        <DragHandle
          label={t("dragCategory", { name: name(category) })}
          listeners={listeners}
          attributes={attributes}
          setActivatorNodeRef={setActivatorNodeRef}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-h3 font-bold">{name(category)}</h2>
          <span className="text-sm text-muted-foreground">{menuT("dishCount", { count: category.items.length })}</span>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className={smallButton}>
            {t("edit")}
          </button>
          <button type="button" onClick={onDelete} className={`${smallButton} text-danger`}>
            {t("delete")}
          </button>
        </div>
      </div>

      <SortableContext items={category.items.map((dish) => dishKey(dish.id))} strategy={verticalListSortingStrategy}>
        <ul ref={setDropRef} className={`flex min-h-14 flex-col divide-y divide-border ${isOver ? "bg-brand-soft" : ""}`}>
          {children}
        </ul>
      </SortableContext>

      <div className="border-t border-border px-3 py-2 sm:px-4">
        <button type="button" onClick={onAddDish} className={`${smallButton} font-semibold text-brand-text`}>
          + {t("addDish")}
        </button>
      </div>
    </li>
  );
}

function DishRow({ dish, categoryId, name, onToggle, onEdit, onDelete }) {
  const t = useTranslations("MenuEditor");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: dishKey(dish.id),
    data: { type: "dish", categoryId },
  });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "opacity-40" : ""}>
      <DishRowContent
        dish={dish}
        name={name}
        handle={
          <DragHandle
            label={t("dragDish", { name: name(dish) })}
            listeners={listeners}
            attributes={attributes}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        }
        controls={
          <>
            <button
              type="button"
              role="switch"
              aria-checked={dish.available !== false}
              aria-label={`${t("available")}: ${name(dish)}`}
              onClick={onToggle}
              className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-150 ${dish.available !== false ? "bg-success" : "bg-border-strong"}`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 size-5 rounded-pill bg-surface shadow-sm transition-[inset-inline-start] duration-150 ${
                  dish.available !== false ? "start-[1.375rem]" : "start-0.5"
                }`}
              />
            </button>
            <button type="button" onClick={onEdit} className={smallButton}>
              {t("edit")}
            </button>
            <button type="button" onClick={onDelete} aria-label={`${t("delete")}: ${name(dish)}`} className={`${smallButton} text-danger`}>
              {t("delete")}
            </button>
          </>
        }
      />
    </li>
  );
}

function DishRowContent({ dish, name, handle, controls, overlay = false }) {
  const t = useTranslations("MenuEditor");
  const menuT = useTranslations("Menu");
  const locale = useLocale();
  const soldOut = dish.available === false;

  return (
    // On phones the controls drop to a second line, so the name keeps the width
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-4 ${overlay ? "rounded-lg border border-border bg-surface shadow-lg" : ""}`}>
      {handle}
      {dish.image ? (
        <Image
          src={dish.image}
          alt=""
          width={40}
          height={40}
          sizes="40px"
          className={`size-10 shrink-0 rounded-md object-cover ${soldOut ? "grayscale" : ""}`}
        />
      ) : (
        <span aria-label={t("noPhoto")} className="size-10 shrink-0 rounded-md bg-surface-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${soldOut ? "text-muted-foreground" : ""}`}>{name(dish)}</p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(dish.priceHalalas / 100, locale)}
          {soldOut && <> · {menuT("soldOut")}</>}
        </p>
      </div>
      {controls && <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">{controls}</div>}
    </div>
  );
}
