import { blockDefaults } from "@/lib/site/blocks";

// Ready arrangements of blocks, each [type, look]. Text and photos belong to the owner, so
// a template only rearranges: see applyTemplate.
export const TEMPLATES = {
  classic: [["hero", "tinted"], ["menu", "grid"], ["about", "text"], ["hours", "table"], ["booking", "band"], ["contact", "cards"]],
  showcase: [["hero", "cover"], ["featured", "grid"], ["gallery", "mosaic"], ["menu", "list"], ["about", "media"], ["booking", "card"], ["hours", "cards"], ["contact", "cards"]],
  simple: [["hero", "split"], ["menu", "compact"], ["hours", "table"], ["contact", "cards"]],
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// The page laid out as this template. A block the page already has keeps its id and its
// settings and only takes the new look. Blocks the template doesn't use leave the page,
// and undo brings them back.
export function applyTemplate(name, blocks) {
  return TEMPLATES[name].map(([type, variant]) => {
    const existing = blocks.find((block) => block.type === type);
    return existing ? { ...existing, variant } : { id: `${type}-1`, type, variant, props: blockDefaults(type) };
  });
}
