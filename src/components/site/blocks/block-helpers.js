// What several blocks need. The hooks are next-intl's, so blocks stay usable on the
// server for the public page and in the browser for the editor.

export const scheduleOf = ({ opens, closes, weeklyHours, exceptions }) => ({ opens, closes, weeklyHours, exceptions });

// A block's own text is { ar, en }, for the editor. The restaurant reaching a block is
// already in one language, but this text isn't.
export const inLanguage = (text, locale) => text?.[locale]?.trim() || "";

export const telHref = (phone) => `tel:${phone.replaceAll(" ", "")}`;
