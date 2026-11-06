import { strict as assert } from "node:assert";
import { test } from "node:test";
import { defaultBlocks } from "@/lib/site/blocks";
import { applyTemplate, TEMPLATE_NAMES, TEMPLATES } from "@/lib/site/templates";
import { PHOTO_GRACE_MS, unusedPhotos } from "@/lib/site/unused-photos";
import { draftBlocksSchema, publishBlocksSchema } from "@/lib/validation/site";

const now = Date.parse("2026-11-06T12:00:00Z");
const old = new Date(now - PHOTO_GRACE_MS - 1000).toISOString();
const fresh = new Date(now - 1000).toISOString();

test("an old photo nothing uses goes", () => {
  assert.deepEqual(unusedPhotos([{ id: "a", createdAt: old }], new Set(), now), ["a"]);
});
test("a used photo stays", () => {
  assert.deepEqual(unusedPhotos([{ id: "a", createdAt: old }], new Set(["a"]), now), []);
});
test("a new upload stays, even unused", () => {
  assert.deepEqual(unusedPhotos([{ id: "a", createdAt: fresh }], new Set(), now), []);
});

for (const name of TEMPLATE_NAMES) {
  test(`${name}: passes as a draft from the default page`, () => {
    assert.equal(draftBlocksSchema.safeParse(applyTemplate(name, defaultBlocks())).success, true);
  });
  test(`${name}: follows its own order and looks`, () => {
    assert.deepEqual(applyTemplate(name, defaultBlocks()).map((block) => [block.type, block.variant]), TEMPLATES[name]);
  });
  test(`${name}: can only be refused publishing for text the owner has to write`, () => {
    const parsed = publishBlocksSchema.safeParse(applyTemplate(name, defaultBlocks()));
    for (const issue of parsed.success ? [] : parsed.error.issues) assert.deepEqual(issue.path.slice(1, 2), ["props"], JSON.stringify(issue));
  });
}

test("the simple template can be published as it is", () => {
  assert.equal(publishBlocksSchema.safeParse(applyTemplate("simple", defaultBlocks())).success, true);
});

const about = { id: "about-7", type: "about", variant: "text", props: { title: { ar: "قصتنا", en: "Story" }, body: { ar: "نص", en: "Text" } } };

test("a template keeps a block's id and text, and only changes its look", () => {
  const kept = applyTemplate("showcase", [...defaultBlocks(), about]).find((block) => block.type === "about");
  assert.equal(kept.id, "about-7");
  assert.equal(kept.variant, "media");
  assert.deepEqual(kept.props, about.props);
});

test("a template leaves the original list alone", () => {
  const before = [...defaultBlocks(), about];
  const copy = structuredClone(before);
  applyTemplate("showcase", before);
  assert.deepEqual(before, copy);
});

test("a block the template doesn't use leaves the page", () => {
  assert.equal(applyTemplate("simple", [...defaultBlocks(), about]).some((block) => block.type === "about"), false);
});

test("a whitespace-only field names its block, field and language", () => {
  const blocks = [...defaultBlocks(), { ...about, props: { title: { ar: "  ", en: "Story" }, body: about.props.body } }];
  assert.deepEqual(publishBlocksSchema.safeParse(blocks).error.issues[0].path, [4, "props", "title", "ar"]);
});

test("a field left out altogether has no language in its path", () => {
  const blocks = [...defaultBlocks(), { ...about, props: { body: about.props.body } }];
  assert.deepEqual(publishBlocksSchema.safeParse(blocks).error.issues[0].path, [4, "props", "title"]);
});
