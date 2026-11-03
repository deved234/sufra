import { getMessages } from "next-intl/server";

// Only these namespaces are sent to the browser. Everything else (page copy,
// metadata) is rendered on the server and never shipped.
export const PUBLIC_NAMESPACES = ["Site", "Theme", "LocaleSwitcher", "OpenStatus", "Menu", "Restaurant", "Dish"];

export async function pickMessages(namespaces) {
  const messages = await getMessages();
  return Object.fromEntries(namespaces.map((key) => [key, messages[key]]));
}
