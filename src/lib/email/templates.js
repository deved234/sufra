import { createTranslator } from "next-intl";
import { formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

// The emails Sufra sends, each as { subject, html, text }. The copy lives in the
// "Email" messages next to the site's own, in the reader's language.
//
// Email HTML is its own, older web: Gmail and Outlook drop <style> sheets in places,
// ignore flexbox and grid, and strip scripts. So the layout is nested tables with
// inline styles, the way mail apps reliably render it. Every message also has a
// plain text version, for apps that don't show HTML and for spam filters that
// distrust HTML-only mail.

const messages = { ar, en };

// The site's palette (src/app/globals.css) as hex: mail apps don't know OKLCH
const color = {
  page: "#fbf8f4",
  card: "#ffffff",
  border: "#e8e2da",
  text: "#1f1b18",
  muted: "#857b72",
  brand: "#9e432f",
  cta: "#f5c451",
};
const FONT = "Tahoma, 'Segoe UI', Arial, sans-serif";

// Names and other user input end up inside the HTML, so they're escaped
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// button: left out of a message that only needs reading. forSomeone: false leaves out
// "if you didn't ask for this", for mail sent to the site's own inbox.
function render({ locale, subject, preheader, heading, paragraphs, button, note, secondary, forSomeone = true }) {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "Email" });
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const p = (text, style = "") =>
    `<p style="margin:0 0 16px;font:16px/1.7 ${FONT};color:${color.text};${style}" class="fg">${escapeHtml(text)}</p>`;
  const small = (html) => `<p style="margin:0 0 12px;font:13px/1.6 ${FONT};color:${color.muted}" class="muted">${html}</p>`;

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background: #1f1b18 !important; }
    .card { background: #2a2521 !important; border-color: #4c4540 !important; }
    .fg { color: #fbf8f4 !important; }
    .muted { color: #b5aca3 !important; }
    .brand { color: #ee7b61 !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${color.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${color.page}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td dir="${dir}" align="${align}" class="brand" style="padding:0 8px 16px;font:800 24px/1.2 ${FONT};color:${color.brand}">${escapeHtml(t("brand"))}</td></tr>
<tr><td dir="${dir}" align="${align}" class="card" style="background:${color.card};border:1px solid ${color.border};border-radius:16px;padding:32px;text-align:${align}">
<h1 style="margin:0 0 16px;font:800 22px/1.4 ${FONT};color:${color.text}" class="fg">${escapeHtml(heading)}</h1>
${paragraphs.map((text) => p(text)).join("\n")}
${button ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>
<td style="border-radius:999px;background:${color.cta}"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;border-radius:999px;font:700 16px/1 ${FONT};color:${color.text};text-decoration:none">${escapeHtml(button.label)}</a></td>
</tr></table>` : ""}
${note ? small(escapeHtml(note)) : ""}
${secondary ? small(`<a href="${escapeHtml(secondary.url)}" class="brand" style="color:${color.brand}">${escapeHtml(secondary.label)}</a>`) : ""}
${button ? small(`${escapeHtml(t("linkFallback"))}<br><a href="${escapeHtml(button.url)}" dir="ltr" class="brand" style="color:${color.brand};word-break:break-all">${escapeHtml(button.url)}</a>`) : ""}
</td></tr>
<tr><td dir="${dir}" align="${align}" style="padding:16px 8px 0">
${forSomeone ? small(escapeHtml(t("ignore"))) : ""}
${small(escapeHtml(t("footer")))}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    "",
    ...paragraphs.flatMap((text) => [text, ""]),
    ...(button ? [`${button.label}:`, button.url, ""] : []),
    ...(note ? [note, ""] : []),
    ...(secondary ? [`${secondary.label}:`, secondary.url, ""] : []),
    ...(forSomeone ? [t("ignore"), ""] : []),
    t("footer"),
  ].join("\n");

  return { subject, html, text };
}

const translator = (locale, namespace) => createTranslator({ locale, messages: messages[locale], namespace: `Email.${namespace}` });

export function verifyEmail({ locale, name, url }) {
  const t = translator(locale, "verify");
  return render({
    locale,
    subject: t("subject"),
    preheader: t("preheader"),
    heading: t("heading", { name }),
    paragraphs: [t("body")],
    button: { label: t("button"), url },
    note: t("expires"),
  });
}

export function resetEmail({ locale, url }) {
  const t = translator(locale, "reset");
  return render({
    locale,
    subject: t("subject"),
    preheader: t("preheader"),
    heading: t("heading"),
    paragraphs: [t("body")],
    button: { label: t("button"), url },
    note: t("expires"),
  });
}

export function accountExistsEmail({ locale, signInUrl, resetUrl }) {
  const t = translator(locale, "exists");
  return render({
    locale,
    subject: t("subject"),
    preheader: t("preheader"),
    heading: t("heading"),
    paragraphs: [t("body")],
    button: { label: t("button"), url: signInUrl },
    secondary: { label: t("forgot"), url: resetUrl },
  });
}

// A booking in one line: "الثلاثاء 10 نوفمبر، 7 م، 4 أشخاص"
function bookingLine(t, locale, { date, time, party }) {
  return t("when", { date: formatDate(date, locale), time: formatTime(time, locale), party });
}

function bookingEmail(namespace, { locale, booking, restaurantName, url, reason = "", reasonLine = false }) {
  const t = translator(locale, namespace);
  const values = { restaurant: restaurantName, name: booking.name, code: booking.code, phone: booking.phone, reason };
  return render({
    locale,
    subject: t("subject", values),
    preheader: t("preheader", values),
    heading: t("heading", values),
    paragraphs: [bookingLine(translator(locale, "booking"), locale, booking), t("body", values), ...(reasonLine && reason ? [t("reason", values)] : [])],
    button: { label: t("button"), url },
  });
}

export const bookingConfirmedEmail = (args) => bookingEmail("bookingConfirmed", args);
export const bookingReminderEmail = (args) => bookingEmail("bookingReminder", args);
// The reason is optional here, so it gets its own line rather than a place in the text
export const bookingCancelledEmail = (args) => bookingEmail("bookingCancelled", { ...args, reasonLine: true });
export const newBookingEmail = (args) => bookingEmail("newBooking", args);
export const ownerCancellationEmail = (args) => bookingEmail("ownerCancellation", args);
export const bookingProposalEmail = (args) => bookingEmail("bookingProposal", args);
export const proposalAcceptedEmail = (args) => bookingEmail("proposalAccepted", args);
export const proposalDeclinedEmail = (args) => bookingEmail("proposalDeclined", args);
export const restaurantClosedEmail = (args) => bookingEmail("restaurantClosed", args);
export const customerRequestEmail = (args) => bookingEmail("customerRequest", args);
export const requestAcceptedEmail = (args) => bookingEmail("requestAccepted", args);
export const requestDeclinedEmail = (args) => bookingEmail("requestDeclined", args);

export function emailChangeEmail({ locale, url }) {
  const t = translator(locale, "emailChange");
  return render({ locale, subject: t("subject"), preheader: t("preheader"), heading: t("heading"), paragraphs: [t("body")], button: { label: t("button"), url }, note: t("expires") });
}

export function emailChangedNoticeEmail({ locale, newEmail, url }) {
  const t = translator(locale, "emailChangedNotice");
  return render({ locale, subject: t("subject"), preheader: t("preheader"), heading: t("heading"), paragraphs: [t("body", { email: newEmail })], button: { label: t("button"), url } });
}

// A short message from the platform: a heading, one paragraph and a button
export function noticeEmail(namespace, { locale, values = {}, url }) {
  const t = translator(locale, namespace);
  return render({ locale, subject: t("subject", values), preheader: t("preheader", values), heading: t("heading", values), paragraphs: [t("body", values)], button: { label: t("button"), url } });
}

// A visitor's message, to the site's own inbox. Each line of it is a paragraph, so its
// line breaks survive in the HTML version. Answering goes to the visitor, by Reply-To.
export function contactEmail({ locale, name, email, message }) {
  const t = translator(locale, "contact");
  return render({
    locale,
    subject: t("subject", { name }),
    preheader: t("from", { name, email }),
    heading: t("subject", { name }),
    paragraphs: [t("from", { name, email }), ...message.split(/\s*\n\s*/).filter(Boolean)],
    note: t("replyHint"),
    forSomeone: false,
  });
}

const sampleBooking = (locale) => ({
  name: locale === "ar" ? "محمد" : "Sarah",
  code: "7K2M9Q",
  phone: "0512345678",
  date: "2026-11-10",
  time: "19:30",
  party: 4,
});
const sampleArgs = (locale) => ({
  locale,
  booking: sampleBooking(locale),
  restaurantName: locale === "ar" ? "مشويات الواحة" : "Al Waha Grills",
  url: "https://example.com/r/al-waha-grills/book/abc",
});

// For the development preview (/api/dev/emails)
export const previews = {
  verify: (locale) => verifyEmail({ locale, name: locale === "ar" ? "محمد" : "Sarah", url: "https://example.com/confirm-email?token=abc" }),
  reset: (locale) => resetEmail({ locale, url: "https://example.com/reset-password?token=abc" }),
  exists: (locale) =>
    accountExistsEmail({ locale, signInUrl: "https://example.com/sign-in", resetUrl: "https://example.com/forgot-password" }),
  bookingConfirmed: (locale) => bookingConfirmedEmail(sampleArgs(locale)),
  bookingReminder: (locale) => bookingReminderEmail(sampleArgs(locale)),
  bookingCancelled: (locale) => bookingCancelledEmail(sampleArgs(locale)),
  newBooking: (locale) => newBookingEmail(sampleArgs(locale)),
  ownerCancellation: (locale) => ownerCancellationEmail(sampleArgs(locale)),
  bookingProposal: (locale) => bookingProposalEmail({ ...sampleArgs(locale), reason: locale === "ar" ? "عندنا مناسبة خاصة في هذا الوقت" : "We have a private event at that time" }),
  proposalAccepted: (locale) => proposalAcceptedEmail(sampleArgs(locale)),
  proposalDeclined: (locale) => proposalDeclinedEmail(sampleArgs(locale)),
  restaurantSuspended: (locale) => noticeEmail("restaurantSuspended", { locale, values: { restaurant: "Al Waha", reason: "Test" }, url: "https://example.com" }),
  restaurantRestored: (locale) => noticeEmail("restaurantRestored", { locale, values: { restaurant: "Al Waha" }, url: "https://example.com" }),
  accountSuspended: (locale) => noticeEmail("accountSuspended", { locale, values: { reason: "Test" }, url: "https://example.com" }),
  accountRestored: (locale) => noticeEmail("accountRestored", { locale, url: "https://example.com" }),
  ownershipTransferred: (locale) => noticeEmail("ownershipTransferred", { locale, values: { restaurant: "Al Waha" }, url: "https://example.com" }),
  restaurantClosed: (locale) => restaurantClosedEmail(sampleArgs(locale)),
  customerRequest: (locale) => customerRequestEmail({ ...sampleArgs(locale), reason: locale === "ar" ? "صار عندنا ظرف" : "Something came up" }),
  requestAccepted: (locale) => requestAcceptedEmail(sampleArgs(locale)),
  requestDeclined: (locale) => requestDeclinedEmail(sampleArgs(locale)),
  emailChange: (locale) => emailChangeEmail({ locale, url: "https://example.com/confirm-email-change?token=abc" }),
  emailChangedNotice: (locale) => emailChangedNoticeEmail({ locale, newEmail: "new@example.com", url: "https://example.com/forgot-password" }),
};
