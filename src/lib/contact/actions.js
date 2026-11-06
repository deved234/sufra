"use server";

import { routing } from "@/i18n/routing";
import { clientIp, hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { contactEmail } from "@/lib/email/templates";
import { fieldErrors } from "@/lib/validation/auth";
import { contactSchema } from "@/lib/validation/contact";

// Nothing from this form is stored: it arrives as an email. It goes out from the
// site's own mail account, as every email does, and answering it reaches the visitor
// through Reply-To.
export async function sendContactMessage(_previous, formData) {
  // A bot that fills in every field gets the answer a person gets, so it has no
  // reason to try again another way
  if (formData.get("leave_empty")) return { sent: true };

  const text = (name) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const values = { name: text("name"), email: text("email"), message: text("message") };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const limits = [
    [`contact:ip:${await clientIp()}`, LIMITS.contactIp],
    ["contact:all", LIMITS.contactAll],
  ];
  for (const [key, limit] of limits) {
    if (await isLimited(key, limit)) return { values, error: "contactLimited" };
  }
  await Promise.all(limits.map(([key, limit]) => hit(key, limit)));

  const locale = routing.locales.includes(formData.get("locale")) ? formData.get("locale") : routing.defaultLocale;
  const { email: replyTo } = parsed.data;
  try {
    // Waited for, unlike the account emails: nothing here is secret, and someone who
    // wrote a message should know if it didn't go, with their text still in the form
    await sendEmail({
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      replyTo,
      locale,
      ...contactEmail({ locale, ...parsed.data }),
    });
  } catch (error) {
    console.error("[contact] failed:", error);
    return { values, error: "contactFailed" };
  }
  return { sent: true };
}
