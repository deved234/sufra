import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BLOCK_TYPES, BLOCKS, defaultBlocks } from "@/lib/site/blocks";
import { HISTORY_LIMIT, historyReducer as reduce, initialHistory } from "@/lib/site/history";
import * as ops from "@/lib/site/ops";
import { draftBlocksSchema } from "@/lib/validation/site";

const freeze = (value) => {
  Object.values(value).forEach((inner) => inner && typeof inner === "object" && freeze(inner));
  return Object.freeze(value);
};
// Frozen, so an edit that changed the list it was given would throw
const base = freeze(defaultBlocks());
const ids = (blocks) => blocks.map((block) => block.id);

test("adding respects each block's limit, and never changes the old list", () => {
  const about = ops.createBlock(base, "about");
  assert.equal(about.id, "about-1");
  assert.equal(about.variant, BLOCKS.about.variants[0]);
  const withAbout = ops.addBlock(base, about, 1);
  assert.deepEqual(ids(withAbout), ["default-hero", "about-1", "default-menu", "default-hours", "default-booking"]);
  assert.equal(base.length, 4);
  assert.equal(ops.addBlock(withAbout, { ...about, id: "about-2" }), null, "about only once");
  assert.equal(ops.addBlock(base, ops.createBlock(base, "hero")), null, "hero only once");
});

test("anything can be removed but the menu", () => {
  assert.equal(ops.removeBlock(base, "default-menu"), null);
  assert.deepEqual(ids(ops.removeBlock(base, "default-hero")), ["default-menu", "default-hours", "default-booking"]);
  assert.equal(ops.removeBlock(base, "nope"), null);
});

test("duplicating makes an independent copy, within the limit", () => {
  const announcement = ops.createBlock(base, "announcement");
  const one = ops.addBlock(base, { ...announcement, props: { text: { ar: "نص", en: "Text" } } }, 0);
  const two = ops.duplicateBlock(one, announcement.id);
  assert.deepEqual(ids(two).slice(0, 2), ["announcement-1", "announcement-2"]);
  assert.notEqual(two[0].props, two[1].props);
  two[1].props.text.ar = "changed";
  assert.equal(two[0].props.text.ar, "نص", "a copy shares nothing");
  const three = ops.duplicateBlock(two, "announcement-1");
  assert.equal(ops.duplicateBlock(three, "announcement-1"), null, "three at most");
  assert.equal(ops.duplicateBlock(base, "default-hero"), null);
});

test("moving stays inside the list", () => {
  assert.deepEqual(ids(ops.moveBlock(base, "default-hero", 2)), ["default-menu", "default-hours", "default-hero", "default-booking"]);
  assert.equal(ops.moveBlock(base, "default-hero", 0), null, "already there");
  assert.equal(ops.moveBlock(base, "default-hero", 9), null);
  assert.equal(ops.moveBlock(base, "default-hero", -1), null);
  assert.equal(ops.moveBlock(base, "nope", 1), null);
});

test("a block only takes looks and settings it has", () => {
  assert.equal(ops.setVariant(base, "default-hero", "cover")[0].variant, "cover");
  assert.equal(ops.setVariant(base, "default-hero", "tinted"), null, "already that");
  assert.equal(ops.setVariant(base, "default-hero", "fancy"), null);
  assert.equal(ops.setProp(base, "default-hero", "showTagline", false)[0].props.showTagline, false);
  assert.equal(ops.setProp(base, "default-hero", "html", "<x>"), null);
  assert.equal("showTagline" in ops.setProp(base, "default-hero", "showTagline", undefined)[0].props, false);
});

test("a page of everything, in every look, is a valid draft with no repeated ids", () => {
  let blocks = base;
  for (const type of BLOCK_TYPES) {
    while (ops.canAdd(blocks, type)) blocks = ops.addBlock(blocks, ops.createBlock(blocks, type));
  }
  assert.equal(draftBlocksSchema.safeParse(blocks).success, true);
  for (const block of blocks) {
    for (const variant of BLOCKS[block.type].variants) {
      const next = ops.setVariant(blocks, block.id, variant);
      if (next) assert.equal(draftBlocksSchema.safeParse(next).success, true);
    }
  }
  assert.equal(new Set(ids(blocks)).size, blocks.length);
});

test("finds the photos a page uses", () => {
  const photo = (n) => ({ id: `sufra/x/${String(n).repeat(24)}` });
  const gallery = ops.setProp(ops.addBlock(base, { id: "g", type: "gallery", variant: "grid", props: {} }), "g", "photos", [photo(1), photo(2)]);
  const page = ops.setProp(ops.addBlock(gallery, { id: "a", type: "about", variant: "media", props: {} }), "a", "photo", photo(3));
  assert.equal(ops.blockPhotoIds(page).length, 3);
});

const step = (state, next, group) => reduce(state, { type: "apply", next, group });

test("an edit that didn't apply is no step, and there's nothing to undo at the start", () => {
  const start = initialHistory(base);
  assert.equal(reduce(start, { type: "undo" }), start);
  assert.equal(reduce(start, { type: "redo" }), start);
  assert.equal(step(start, null), start);
});

test("undo and redo return the exact lists", () => {
  const first = ops.moveBlock(base, "default-hero", 1);
  const second = ops.setVariant(first, "default-hero", "cover");
  let history = step(step(initialHistory(base), first), second);
  history = reduce(history, { type: "undo" });
  assert.equal(history.blocks, first);
  history = reduce(history, { type: "undo" });
  assert.equal(history.blocks, base);
  history = reduce(reduce(history, { type: "redo" }), { type: "redo" });
  assert.equal(history.blocks, second);
  assert.equal(reduce(history, { type: "redo" }), history);
});

test("a new edit after undo clears redo", () => {
  const first = ops.moveBlock(base, "default-hero", 1);
  const history = reduce(reduce(step(initialHistory(base), first), { type: "undo" }), { type: "apply", next: first });
  assert.equal(history.future.length, 0);
});

test("typing in one field is one step", () => {
  let history = initialHistory(base);
  let list = base;
  for (const text of ["ع", "عر", "عرض"]) {
    list = ops.setProp(list, "default-hero", "showTagline", text !== "ع");
    history = step(history, list, "hero:title");
  }
  assert.equal(history.past.length, 1);
  history = reduce(history, { type: "endGroup" });
  history = step(history, ops.setProp(list, "default-hero", "showStatus", false), "hero:title");
  assert.equal(history.past.length, 2, "after leaving the field, it's a new step");
  const other = step(history, ops.setProp(history.blocks, "default-hero", "showTagline", true), "hero:other");
  assert.equal(other.past.length, 3, "another field is another step");
  history = reduce(reduce(history, { type: "undo" }), { type: "undo" });
  assert.equal(history.blocks, base, "one undo takes back all the typing");
  const typedAfterUndo = step(reduce(step(initialHistory(base), list, "x"), { type: "undo" }), list, "x");
  assert.equal(typedAfterUndo.past.length, 1, "undo ends the group too");
});

test(`history stops at ${HISTORY_LIMIT} steps`, () => {
  let long = initialHistory(base);
  for (let i = 0; i < HISTORY_LIMIT + 50; i++) long = step(long, ops.setProp(long.blocks, "default-hero", "showTagline", i % 2 === 0));
  assert.equal(long.past.length, HISTORY_LIMIT);
});

test("taking another version starts fresh", () => {
  const edited = step(initialHistory(base), ops.moveBlock(base, "default-hero", 1));
  const replaced = reduce(edited, { type: "replace", blocks: base });
  assert.equal(replaced.blocks, base);
  assert.equal(replaced.past.length, 0);
  assert.throws(() => reduce(edited, { type: "nope" }));
});
