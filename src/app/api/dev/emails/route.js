import { previews } from "@/lib/email/templates";

// Development only: shows an email as a mail app would, e.g.
// /api/dev/emails?name=verify&locale=ar (add &format=text for the plain version)
export async function GET(request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });

  const params = request.nextUrl.searchParams;
  const preview = previews[params.get("name")];
  const locale = params.get("locale") === "en" ? "en" : "ar";
  if (!preview) {
    return new Response(`Try ?name=${Object.keys(previews).join("|")}&locale=ar|en`, { status: 404 });
  }

  const email = preview(locale);
  return params.get("format") === "text"
    ? new Response(email.text, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
