// What a restaurant's page can be built from. This one list decides the blocks, their
// looks and their settings: the validation comes from it, and the editor's forms will
// too, so adding a block starts here. Plain data, shared by the server and the browser.
//
// Field types:
//   text, longText  { ar, en }, up to `max` characters
//   boolean         on or off
//   select          one of `options`
//   photo, photos   stored photos, `photos` up to `max`
//   dishes          dish ids from the restaurant's menu, up to `max`

// versions: how many past publishes are kept to go back to
export const SITE_LIMITS = { blocks: 30, versions: 20 };

export const BLOCKS = {
  hero: {
    max: 1,
    variants: ["tinted", "cover", "split"],
    fields: {
      showTagline: { type: "boolean", default: true },
      showStatus: { type: "boolean", default: true },
    },
  },
  menu: {
    max: 1,
    required: true,
    variants: ["grid", "list", "compact"],
    fields: {
      showTabs: { type: "boolean", default: true },
    },
  },
  featured: {
    max: 1,
    variants: ["grid", "strip"],
    fields: {
      title: { type: "text", max: 60 },
      dishes: { type: "dishes", max: 6, default: [] },
    },
  },
  about: {
    max: 1,
    variants: ["text", "media"],
    fields: {
      title: { type: "text", max: 60, required: true },
      body: { type: "longText", max: 1000, required: true },
      photo: { type: "photo" },
    },
  },
  gallery: {
    max: 1,
    variants: ["grid", "mosaic"],
    fields: {
      title: { type: "text", max: 60 },
      photos: { type: "photos", max: 12, default: [] },
    },
  },
  hours: {
    max: 1,
    variants: ["table", "cards"],
    fields: {},
  },
  booking: {
    max: 1,
    variants: ["band", "card"],
    fields: {},
  },
  contact: {
    max: 1,
    variants: ["cards"],
    fields: {
      showMap: { type: "boolean", default: true },
    },
  },
  announcement: {
    max: 3,
    variants: ["band"],
    fields: {
      text: { type: "text", max: 140, required: true },
      tone: { type: "select", options: ["brand", "soft"], default: "soft" },
    },
  },
};

export const BLOCK_TYPES = Object.keys(BLOCKS);

// A new block's settings
export function blockDefaults(type) {
  const props = {};
  for (const [name, field] of Object.entries(BLOCKS[type].fields)) {
    if ("default" in field) props[name] = field.default;
  }
  return props;
}

// The page every restaurant has until its owner publishes one of their own
export function defaultBlocks() {
  const block = (type, variant) => ({ id: `default-${type}`, type, variant, props: blockDefaults(type) });
  return [block("hero", "tinted"), block("menu", "grid"), block("hours", "table"), block("booking", "band")];
}

export const siteBlocks = (restaurant) => restaurant.site?.blocks ?? defaultBlocks();
