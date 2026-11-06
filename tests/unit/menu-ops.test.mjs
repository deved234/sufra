import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as ops from "@/lib/menu-ops";

const dish = (id) => ({ id, name: id });
const menu = () => [
  { id: "grills", items: [dish("kebab"), dish("tawook")] },
  { id: "starters", items: [dish("hummus")] },
];
const names = (list) => list.map((category) => [category.id, category.items.map((item) => item.id)]);

test("edits never change the menu they're given", () => {
  const before = menu();
  const copy = structuredClone(before);
  ops.addDish(before, "grills", dish("x"));
  ops.removeDish(before, "kebab");
  ops.moveDish(before, "kebab", "starters", 0);
  ops.renameCategory(before, "grills", "new");
  assert.deepEqual(before, copy);
});

test("a new category starts empty", () => {
  assert.deepEqual(ops.addCategory(menu(), { id: "new", items: [dish("ignored")] }).at(-1).items, []);
});

test("removing a category, and an unknown one is refused", () => {
  assert.deepEqual(names(ops.removeCategory(menu(), "grills")), [["starters", ["hummus"]]]);
  assert.equal(ops.removeCategory(menu(), "nope"), null);
});

test("reordering needs every category exactly once, so an old list can't drop one", () => {
  assert.deepEqual(ops.reorderCategories(menu(), ["starters", "grills"]).map((category) => category.id), ["starters", "grills"]);
  assert.equal(ops.reorderCategories(menu(), ["starters"]), null);
  assert.equal(ops.reorderCategories(menu(), ["starters", "starters"]), null);
  assert.equal(ops.reorderCategories(menu(), ["starters", "nope"]), null);
});

test("a dish edited in place keeps its position", () => {
  const next = ops.replaceDish(menu(), "kebab", { id: "kebab", name: "new" });
  assert.deepEqual(names(next)[0], ["grills", ["kebab", "tawook"]]);
  assert.equal(next[0].items[0].name, "new");
});

test("a dish given another category moves to its end", () => {
  assert.deepEqual(names(ops.replaceDish(menu(), "kebab", dish("kebab"), "starters")), [
    ["grills", ["tawook"]],
    ["starters", ["hummus", "kebab"]],
  ]);
});

test("moving within a category and across, with the position kept in range", () => {
  assert.deepEqual(names(ops.moveDish(menu(), "tawook", "grills", 0))[0][1], ["tawook", "kebab"]);
  assert.deepEqual(names(ops.moveDish(menu(), "kebab", "starters", 0))[1][1], ["kebab", "hummus"]);
  assert.deepEqual(names(ops.moveDish(menu(), "kebab", "starters", 99))[1][1], ["hummus", "kebab"]);
  assert.deepEqual(names(ops.moveDish(menu(), "kebab", "starters", -5))[1][1], ["kebab", "hummus"]);
});

test("unknown ids change nothing", () => {
  assert.equal(ops.addDish(menu(), "nope", dish("x")), null);
  assert.equal(ops.removeDish(menu(), "nope"), null);
  assert.equal(ops.replaceDish(menu(), "nope", dish("x")), null);
  assert.equal(ops.setDishAvailable(menu(), "nope", false), null);
  assert.equal(ops.moveDish(menu(), "nope", "grills", 0), null);
  assert.equal(ops.moveDish(menu(), "kebab", "nope", 0), null);
});

test("a dish can be marked unavailable", () => {
  assert.equal(ops.findDish(ops.setDishAvailable(menu(), "tawook", false), "tawook").dish.available, false);
});

test("ids come from the text, are unique, and have a fallback for Arabic", () => {
  assert.equal(ops.makeId("Grilled Chicken!", new Set()), "grilled-chicken");
  assert.equal(ops.makeId("Grilled Chicken", new Set(["grilled-chicken"])), "grilled-chicken-2");
  assert.equal(ops.makeId("Grilled Chicken", new Set(["grilled-chicken", "grilled-chicken-2"])), "grilled-chicken-3");
  assert.equal(ops.makeId("شيش طاووق", new Set(), "dish"), "dish");
  assert.ok(ops.makeId("x".repeat(100), new Set()).length <= 40);
});

test("all dish ids across categories", () => {
  assert.deepEqual([...ops.allDishIds(menu())], ["kebab", "tawook", "hummus"]);
});
