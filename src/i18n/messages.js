import { getMessages } from "next-intl/server";

// Only these namespaces are sent to the browser. Everything else (page copy,
// metadata) is rendered on the server and never shipped.
export const PUBLIC_NAMESPACES = ["Site", "Theme", "LocaleSwitcher", "OpenStatus", "Menu", "Restaurant", "Dish"];

// The messages of a language other than the page's, for the site editor's preview.
// getMessages can't do this: request.js always answers in the address's language.
export async function pickMessagesIn(locale, namespaces) {
  const messages = (await import(`../messages/${locale}.json`)).default;
  return Object.fromEntries(namespaces.map((key) => [key, messages[key]]));
}

export async function pickMessages(namespaces) {
  const messages = await getMessages();
  return Object.fromEntries(namespaces.map((key) => [key, messages[key]]));
}
