import { BLOCKS, blockDefaults } from "@/lib/site/blocks";
import { applyTemplate } from "@/lib/site/templates";

// The page in the /for-restaurants demo, which anyone can rearrange with no account. It's
// real blocks and real edits on a sample restaurant, and nothing is ever saved.

// The gallery is left out because its photos can only be owners' uploads
export const DEMO_BLOCK_TYPES = ["hero", "announcement", "featured", "menu", "about", "hours", "booking", "contact"];

export const DEMO_ACCENTS = { coral: "#C8553D", bronze: "#8A6A3B", sea: "#2F6F8F", green: "#2E7D5B" };

// What an owner would have filled in. Dishes are from the sample restaurant's menu.
const CONTENT = {
  announcement: {
    text: { ar: "جديدنا: مندي على الحطب كل خميس وجمعة", en: "New: wood-fired mandi every Thursday and Friday" },
    tone: "brand",
  },
  featured: {
    title: { ar: "أشهر أطباقنا", en: "Our favorites" },
    dishes: ["kabsa-lahm", "mandi-dajaj", "mathbi-lahm"],
  },
  about: {
    title: { ar: "قصتنا", en: "Our story" },
    body: {
      ar: "بدأنا بقدر كبسة وحدة ووصفة الجدة، وللحين نطبخ كل يوم بنفس البهارات.",
      en: "We started with one pot of kabsa and grandma's recipe, and we still cook with the same spices every day.",
    },
  },
};

export function demoBlock(type, variant = BLOCKS[type].variants[0]) {
  return { id: `${type}-1`, type, variant, props: { ...blockDefaults(type), ...CONTENT[type] } };
}

export const demoBlocks = () => [demoBlock("hero", "split"), demoBlock("featured"), demoBlock("menu"), demoBlock("hours"), demoBlock("booking")];

// "media" needs an uploaded photo, so here the story has its one look
export const demoVariants = (type) => (type === "about" ? ["text"] : BLOCKS[type].variants);

// A template, with the sample's own content in any block the page has lost by now
export function applyDemoTemplate(name, blocks) {
  const missing = DEMO_BLOCK_TYPES.filter((type) => !blocks.some((block) => block.type === type)).map((type) => demoBlock(type));
  return applyTemplate(name, [...blocks, ...missing]).filter((block) => DEMO_BLOCK_TYPES.includes(block.type));
}
