// Lets plain Node run the app's modules: "@/x" means src/x, and "server-only" (which
// throws outside Next's server build) does nothing. Used with: node --import
import { register } from "node:module";

const src = new URL("../src/", import.meta.url).href;

register(
  "data:text/javascript," +
    encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const SRC = ${JSON.stringify(src)};
export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  if (/^next\\/[a-z-]+$/.test(specifier)) return next(specifier + ".js", context);
  if (specifier.startsWith("@/")) {
    const base = SRC + encodeURI(specifier.slice(2));
    const file = [base + ".js", base + ".jsx", base].find((url) => existsSync(fileURLToPath(url)));
    // Next's bundler reads JSON without the attribute that Node asks for
    if (base.endsWith(".json")) {
      const importAttributes = { type: "json" };
      return { ...(await next(base, { ...context, importAttributes })), importAttributes };
    }
    return next(file ?? base, context);
  }
  return next(specifier, context);
}
// Next's bundler turns an imported picture into its details. Here, only that it's there matters.
export async function load(url, context, next) {
  if (/\\.(webp|png|jpe?g)$/.test(url)) return { format: "module", source: "export default { src: " + JSON.stringify(url) + " };", shortCircuit: true };
  return next(url, context);
}
`),
);
