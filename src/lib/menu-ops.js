// Pure menu edits, shared by the editor and the Server Actions. The editor runs
// them for the instant (optimistic) update; the server runs the same function on
// the stored menu before saving, so both sides always agree on the result.
// Each returns a new menu, or null when the edit doesn't apply (unknown id...).

const indexOfDish = (menu, dishId) => {
  for (let ci = 0; ci < menu.length; ci++) {
    const di = menu[ci].items.findIndex((item) => item.id === dishId);
    if (di !== -1) return { ci, di };
  }
  return null;
};

export const findDish = (menu, dishId) => {
  const at = indexOfDish(menu, dishId);
  return at && { category: menu[at.ci], dish: menu[at.ci].items[at.di] };
};

const updateCategory = (menu, categoryId, update) => {
  const index = menu.findIndex((category) => category.id === categoryId);
  if (index === -1) return null;
  return menu.map((category, i) => (i === index ? update(category) : category));
};

export function addCategory(menu, category) {
  return [...menu, { ...category, items: [] }];
}

export function renameCategory(menu, categoryId, name) {
  return updateCategory(menu, categoryId, (category) => ({ ...category, name }));
}

export function removeCategory(menu, categoryId) {
  const next = menu.filter((category) => category.id !== categoryId);
  return next.length === menu.length ? null : next;
}

// ids: every category id, in the new order. Anything missing or extra is refused,
// so a stale editor can't drop a category by sending an old list.
export function reorderCategories(menu, ids) {
  if (ids.length !== menu.length || new Set(ids).size !== ids.length) return null;
  const byId = new Map(menu.map((category) => [category.id, category]));
  if (!ids.every((id) => byId.has(id))) return null;
  return ids.map((id) => byId.get(id));
}

export function addDish(menu, categoryId, dish) {
  return updateCategory(menu, categoryId, (category) => ({ ...category, items: [...category.items, dish] }));
}

// Replaces a dish's fields; a different categoryId moves it to the end of that category
export function replaceDish(menu, dishId, dish, categoryId) {
  const found = findDish(menu, dishId);
  if (!found) return null;
  if (!categoryId || categoryId === found.category.id) {
    return updateCategory(menu, found.category.id, (category) => ({
      ...category,
      items: category.items.map((item) => (item.id === dishId ? dish : item)),
    }));
  }
  const without = removeDish(menu, dishId);
  return addDish(without, categoryId, dish);
}

export function removeDish(menu, dishId) {
  const found = findDish(menu, dishId);
  if (!found) return null;
  return updateCategory(menu, found.category.id, (category) => ({
    ...category,
    items: category.items.filter((item) => item.id !== dishId),
  }));
}

export function setDishAvailable(menu, dishId, available) {
  const found = findDish(menu, dishId);
  if (!found) return null;
  return replaceDish(menu, dishId, { ...found.dish, available });
}

// Moves a dish to position `index` in a category (the same one or another)
export function moveDish(menu, dishId, toCategoryId, index) {
  const found = findDish(menu, dishId);
  if (!found || !menu.some((category) => category.id === toCategoryId)) return null;
  const without = removeDish(menu, dishId);
  return updateCategory(without, toCategoryId, (category) => {
    const items = [...category.items];
    items.splice(Math.max(0, Math.min(index, items.length)), 0, found.dish);
    return { ...category, items };
  });
}

// "Grilled Chicken" -> "grilled-chicken", made unique among the taken ids.
// Ids appear in links (?category=, /dish/...), so they never change afterwards.
export function makeId(text, taken, fallback = "item") {
  const base =
    text
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || fallback;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export const allDishIds = (menu) => new Set(menu.flatMap((category) => category.items.map((item) => item.id)));
