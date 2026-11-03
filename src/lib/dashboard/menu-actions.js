"use server";

import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { getCurrentUser } from "@/lib/auth/dal";
import * as ops from "@/lib/menu-ops";
import { fieldErrors } from "@/lib/validation/auth";
import { categorySchema, dishSchema, idSchema, readCategoryForm, readDishForm, toStoredDish } from "@/lib/validation/menu";

// Every menu edit goes through mutateMenu: read the stored menu, apply one of the
// shared operations (src/lib/menu-ops.js) and save it only if the menu is still
// exactly what was read (compare-and-swap). If someone saved in between, say from
// another tab, it reads again and retries, so no edit silently overwrites another.
// The owner is part of every query: another user's slug simply matches nothing.

const MAX_TRIES = 3;

async function mutateMenu(slug, edit) {
  const user = await getCurrentUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };

  const restaurants = getDb().collection(RESTAURANTS);
  const owned = { slug, ownerIds: new ObjectId(user.id) };

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const current = await restaurants.findOne(owned, { projection: { _id: 0, menu: 1 } });
    if (!current) return { error: "notFound" };

    const result = edit(current.menu);
    if (result.error) return result;

    const { matchedCount } = await restaurants.updateOne({ ...owned, menu: current.menu }, { $set: { menu: result.menu } });
    if (matchedCount === 1) {
      updateTag(`restaurant:${slug}`); // the public pages
      refresh(); // this dashboard page
      return { ok: true, ...result.extra };
    }
  }
  return { error: "conflict" };
}

const applied = (menu, extra) => (menu ? { menu, extra } : { error: "stale" });

export async function createCategory(slug, _previous, formData) {
  const values = readCategoryForm(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const result = await mutateMenu(slug, (menu) => {
    if (menu.length >= 30) return { error: "tooMany" };
    const id = ops.makeId(parsed.data.name.en, new Set(menu.map((c) => c.id)), "section");
    return applied(ops.addCategory(menu, { id, name: parsed.data.name }), { id });
  });
  return result.ok ? { ...result, done: Date.now() } : { values, ...result };
}

export async function updateCategory(slug, categoryId, _previous, formData) {
  const values = readCategoryForm(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const result = await mutateMenu(slug, (menu) => applied(ops.renameCategory(menu, categoryId, parsed.data.name)));
  return result.ok ? { ...result, done: Date.now() } : { values, ...result };
}

export async function deleteCategory(slug, categoryId) {
  return mutateMenu(slug, (menu) => applied(ops.removeCategory(menu, categoryId)));
}

export async function reorderCategories(slug, ids) {
  if (!Array.isArray(ids) || !ids.every((id) => idSchema.safeParse(id).success)) return { error: "stale" };
  return mutateMenu(slug, (menu) => applied(ops.reorderCategories(menu, ids)));
}

export async function createDish(slug, _previous, formData) {
  const values = readDishForm(formData);
  const parsed = dishSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const result = await mutateMenu(slug, (menu) => {
    if (menu.reduce((n, c) => n + c.items.length, 0) >= 300) return { error: "tooMany" };
    // Dish ids are unique across the restaurant: they name the dish page and its photo
    const id = ops.makeId(parsed.data.name.en, ops.allDishIds(menu), "dish");
    return applied(ops.addDish(menu, parsed.data.categoryId, toStoredDish(id, parsed.data)), { id });
  });
  return result.ok ? { ...result, done: Date.now() } : { values, ...result };
}

export async function updateDish(slug, dishId, _previous, formData) {
  const values = readDishForm(formData);
  const parsed = dishSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const result = await mutateMenu(slug, (menu) =>
    applied(ops.replaceDish(menu, dishId, toStoredDish(dishId, parsed.data), parsed.data.categoryId)),
  );
  return result.ok ? { ...result, done: Date.now() } : { values, ...result };
}

export async function deleteDish(slug, dishId) {
  return mutateMenu(slug, (menu) => applied(ops.removeDish(menu, dishId)));
}

export async function setDishAvailable(slug, dishId, available) {
  if (typeof available !== "boolean") return { error: "stale" };
  return mutateMenu(slug, (menu) => applied(ops.setDishAvailable(menu, dishId, available)));
}

export async function moveDish(slug, dishId, toCategoryId, index) {
  if (!Number.isInteger(index) || index < 0) return { error: "stale" };
  return mutateMenu(slug, (menu) => applied(ops.moveDish(menu, dishId, toCategoryId, index)));
}
