import { strict as assert } from "node:assert";
import { test } from "node:test";
import { seedRestaurants } from "@/db/seed-data";
import { applyDemoTemplate, demoBlock, demoBlocks, DEMO_BLOCK_TYPES, demoVariants } from "@/lib/site/demo";
import { BLOCKS } from "@/lib/site/blocks";
import { TEMPLATE_NAMES } from "@/lib/site/templates";
import { publishBlocksSchema } from "@/lib/validation/site";

test("the demo's page could really be published", () => {
  const every = DEMO_BLOCK_TYPES.map((type) => demoBlock(type));
  for (const blocks of [demoBlocks(), every]) {
    const result = publishBlocksSchema.safeParse(blocks);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  }
});

test("its chosen dishes are all on the sample restaurant's first two sections", () => {
  const dishes = seedRestaurants[0].menu.slice(0, 2).flatMap((category) => category.items.map((item) => item.id));
  for (const id of demoBlock("featured").props.dishes) assert.ok(dishes.includes(id), id);
});

test("each template gives a full page with no block the demo can't show", () => {
  for (const name of TEMPLATE_NAMES) {
    // From a page that has lost nearly everything, the hardest case
    const blocks = applyDemoTemplate(name, [demoBlock("menu")]);
    assert.ok(blocks.length >= 4, name);
    assert.equal(new Set(blocks.map((block) => block.id)).size, blocks.length, `${name} has repeated ids`);
    for (const block of blocks) {
      assert.ok(DEMO_BLOCK_TYPES.includes(block.type), `${name} has ${block.type}`);
      assert.ok(BLOCKS[block.type].variants.includes(block.variant));
    }
    const result = publishBlocksSchema.safeParse(blocks);
    assert.equal(result.success, true, `${name}: ${JSON.stringify(result.error?.issues)}`);
    const about = blocks.find((block) => block.type === "about");
    if (about) assert.ok(about.props.title.ar && about.props.body.en);
  }
});

test("the story offers only the look that works without an uploaded photo", () => {
  assert.deepEqual(demoVariants("about"), ["text"]);
  assert.deepEqual(demoVariants("menu"), BLOCKS.menu.variants);
});
