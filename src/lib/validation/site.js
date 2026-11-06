import { z } from "zod";
import { BLOCK_TYPES, BLOCKS, SITE_LIMITS } from "@/lib/site/blocks";
import { idSchema } from "@/lib/validation/menu";

// A site as a browser sends it. The rules come from the list of blocks, so a block's
// settings can't drift from what's checked. There are two levels: a draft may be half
// written, and publishing needs what visitors will read to be there in both languages.
// Messages are "Form.errors" keys.

const photo = z.strictObject({
  id: z.string().regex(/^sufra\/[a-z0-9-]+\/[a-f0-9]{24}$/, "photoInvalid"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blur: z.string().max(1500).regex(/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/, "photoInvalid").optional(),
});

function fieldSchema(field, strict) {
  switch (field.type) {
    case "text":
    case "longText": {
      const one = z.string().trim().max(field.max, "tooLong");
      const required = strict && field.required;
      const text = required ? one.min(1, "required") : one;
      const both = z.strictObject({ ar: text, en: text });
      return required ? both : both.optional();
    }
    case "boolean":
      return z.boolean().optional();
    case "select":
      return z.enum(field.options).optional();
    case "photo":
      return photo.optional();
    case "photos":
      return z.array(photo).max(field.max, "tooMany").optional();
    case "dishes":
      return z.array(idSchema).max(field.max, "tooMany").optional();
    default:
      throw new Error(`Unknown field type: ${field.type}`);
  }
}

function blockSchema(type, strict) {
  const { variants, fields } = BLOCKS[type];
  return z.strictObject({
    id: idSchema,
    type: z.literal(type),
    variant: z.enum(variants),
    props: z.strictObject(Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, fieldSchema(field, strict)]))),
  });
}

const blocksSchema = (strict) =>
  z
    .array(z.discriminatedUnion("type", BLOCK_TYPES.map((type) => blockSchema(type, strict))))
    .max(SITE_LIMITS.blocks, "tooMany")
    .superRefine((blocks, context) => {
      const ids = new Set(blocks.map((block) => block.id));
      if (ids.size !== blocks.length) context.addIssue({ code: "custom", message: "siteInvalid" });
      for (const type of BLOCK_TYPES) {
        const count = blocks.filter((block) => block.type === type).length;
        if (count > BLOCKS[type].max) context.addIssue({ code: "custom", message: "tooMany" });
        if (BLOCKS[type].required && count === 0) context.addIssue({ code: "custom", message: "siteNeedsMenu" });
      }
    });

export const draftBlocksSchema = blocksSchema(false);
export const publishBlocksSchema = blocksSchema(true);
