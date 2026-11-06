import { BLOCKS, SITE_LIMITS, blockDefaults } from "@/lib/site/blocks";

// Pure edits to a page's blocks, like menu-ops for the menu. Each returns a new list and
// leaves the old one alone, which is what makes undo simple: history is just old lists.
// Each returns null when the edit doesn't apply (unknown id, a limit reached...).

const indexOf = (blocks, id) => blocks.findIndex((block) => block.id === id);

export function canAdd(blocks, type) {
  return blocks.length < SITE_LIMITS.blocks && blocks.filter((block) => block.type === type).length < BLOCKS[type].max;
}

export const canRemove = (block) => !BLOCKS[block.type].required;

// "about-1", or the next number free. Ids never change, so the editor can follow a block.
export function newBlockId(blocks, type) {
  const taken = new Set(blocks.map((block) => block.id));
  let n = 1;
  while (taken.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

export function createBlock(blocks, type) {
  return { id: newBlockId(blocks, type), type, variant: BLOCKS[type].variants[0], props: blockDefaults(type) };
}

// index: where it goes, the end if left out
export function addBlock(blocks, block, index = blocks.length) {
  if (!canAdd(blocks, block.type)) return null;
  const next = [...blocks];
  next.splice(Math.max(0, Math.min(index, blocks.length)), 0, block);
  return next;
}

export function removeBlock(blocks, id) {
  const block = blocks[indexOf(blocks, id)];
  if (!block || !canRemove(block)) return null;
  return blocks.filter((item) => item.id !== id);
}

// A copy right after the original, sharing nothing with it
export function duplicateBlock(blocks, id) {
  const at = indexOf(blocks, id);
  if (at === -1 || !canAdd(blocks, blocks[at].type)) return null;
  const copy = { ...structuredClone(blocks[at]), id: newBlockId(blocks, blocks[at].type) };
  return addBlock(blocks, copy, at + 1);
}

export function moveBlock(blocks, id, toIndex) {
  const from = indexOf(blocks, id);
  if (from === -1 || toIndex < 0 || toIndex >= blocks.length || toIndex === from) return null;
  const next = [...blocks];
  const [block] = next.splice(from, 1);
  next.splice(toIndex, 0, block);
  return next;
}

const updateBlock = (blocks, id, update) => {
  const at = indexOf(blocks, id);
  if (at === -1) return null;
  return blocks.map((block, index) => (index === at ? update(block) : block));
};

export function setVariant(blocks, id, variant) {
  const block = blocks[indexOf(blocks, id)];
  if (!block || !BLOCKS[block.type].variants.includes(variant) || block.variant === variant) return null;
  return updateBlock(blocks, id, (item) => ({ ...item, variant }));
}

// undefined removes the setting
export function setProp(blocks, id, name, value) {
  const block = blocks[indexOf(blocks, id)];
  if (!block || !(name in BLOCKS[block.type].fields)) return null;
  return updateBlock(blocks, id, (item) => {
    const props = { ...item.props };
    if (value === undefined) delete props[name];
    else props[name] = value;
    return { ...item, props };
  });
}

// Every stored photo a list of blocks uses
export function blockPhotoIds(blocks) {
  return blocks.flatMap((block) =>
    Object.entries(BLOCKS[block.type].fields).flatMap(([name, field]) => {
      const value = block.props[name];
      if (field.type === "photo") return value ? [value.id] : [];
      if (field.type === "photos") return (value ?? []).map((photo) => photo.id);
      return [];
    }),
  );
}
