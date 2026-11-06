import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BLOCK_TYPES, BLOCKS, blockDefaults, defaultBlocks, siteBlocks } from "@/lib/site/blocks";
import { draftBlocksSchema, publishBlocksSchema } from "@/lib/validation/site";

const errors = (schema, blocks) => {
  const result = schema.safeParse(blocks);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};
const menu = { id: "m", type: "menu", variant: "grid", props: {} };
const both = (ar, en) => ({ ar, en });
const photo = { id: `sufra/x/${"a".repeat(24)}`, width: 800, height: 600, blur: "data:image/webp;base64,AAAA" };

test("the default page is valid, and a published page replaces it", () => {
  const defaults = defaultBlocks();
  assert.deepEqual(defaults.map((block) => block.type), ["hero", "menu", "hours", "booking"]);
  assert.deepEqual(errors(draftBlocksSchema, defaults), []);
  assert.deepEqual(errors(publishBlocksSchema, defaults), []);
  assert.equal(siteBlocks({}).length, 4);
  const custom = [menu];
  assert.equal(siteBlocks({ site: { blocks: custom } }), custom);
});

test("every block and look passes as a draft with its defaults", () => {
  for (const type of BLOCK_TYPES) {
    for (const variant of BLOCKS[type].variants) {
      const block = { id: `${type}-1`, type, variant, props: blockDefaults(type) };
      assert.deepEqual(errors(draftBlocksSchema, type === "menu" ? [block] : [menu, block]), [], `${type}/${variant}`);
    }
  }
});

test("a draft may be half written, and publishing wants both languages", () => {
  const half = { id: "a", type: "about", variant: "text", props: { title: both("قصتنا", ""), body: both("", "") } };
  assert.deepEqual(errors(draftBlocksSchema, [menu, half]), []);
  const missing = errors(publishBlocksSchema, [menu, half]);
  assert.ok(missing.includes("required") && missing.length === 3, `publish wants the three empty texts, got ${missing}`);
  const done = { ...half, props: { title: both("قصتنا", "Our story"), body: both("نص", "Text") } };
  assert.deepEqual(errors(publishBlocksSchema, [menu, done]), []);
});

const refused = {
  "no menu": [{ id: "h", type: "hero", variant: "tinted", props: {} }],
  "two menus": [menu, { ...menu, id: "m2" }],
  "two heroes": [menu, { id: "a", type: "hero", variant: "tinted", props: {} }, { id: "b", type: "hero", variant: "tinted", props: {} }],
  "four announcements": [menu, ...[1, 2, 3, 4].map((n) => ({ id: `a${n}`, type: "announcement", variant: "band", props: {} }))],
  "a repeated id": [menu, { id: "m", type: "hours", variant: "table", props: {} }],
  "an unknown block": [menu, { id: "x", type: "script", variant: "a", props: {} }],
  "an unknown look": [{ ...menu, variant: "fancy" }],
  "an unknown setting": [{ ...menu, props: { html: "<script>" } }],
  "a stray field on a block": [{ ...menu, style: "x" }],
  "a bad id": [{ ...menu, id: "../x" }],
  "a setting of the wrong type": [{ ...menu, props: { showTabs: "yes" } }],
  "a select outside its options": [menu, { id: "a", type: "announcement", variant: "band", props: { tone: "javascript" } }],
  "text in one language only": [menu, { id: "a", type: "announcement", variant: "band", props: { text: { ar: "x" } } }],
  "text as a plain string": [menu, { id: "a", type: "announcement", variant: "band", props: { text: "x" } }],
  "too long a text": [menu, { id: "a", type: "announcement", variant: "band", props: { text: both("x".repeat(141), "y") } }],
  "an outside photo": [menu, { id: "a", type: "about", variant: "media", props: { photo: { id: "https://evil.example/x.jpg" } } }],
  "a photo with a bad preview": [menu, { id: "a", type: "about", variant: "media", props: { photo: { ...photo, blur: 'x");background:url(evil)' } } }],
  "thirteen photos": [menu, { id: "g", type: "gallery", variant: "grid", props: { photos: Array(13).fill(photo) } }],
  "seven featured dishes": [menu, { id: "f", type: "featured", variant: "grid", props: { dishes: ["a", "b", "c", "d", "e", "f", "g"] } }],
  "too many blocks": [menu, ...Array.from({ length: 30 }, (_, n) => ({ id: `h${n}`, type: "hours", variant: "table", props: {} }))],
  "not a list": { blocks: [] },
};
for (const [label, blocks] of Object.entries(refused)) {
  test(`refuses ${label}`, () => {
    assert.ok(errors(draftBlocksSchema, blocks).length > 0);
  });
}
