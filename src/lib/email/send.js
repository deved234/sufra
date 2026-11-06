import "server-only";
import { buildMessage } from "@/lib/email/mime";
import { sendMail } from "@/lib/email/smtp";

// Sends through a mail account over SMTP: Gmail by default (smtp.gmail.com:465,
// signed in with an app password). The message goes out from that account's own
// address, which Gmail signs (DKIM), so it isn't treated as spoofed.
//
// Without SMTP settings (local work, tests) the email is printed to the server
// console instead, links included. That's never allowed on Vercel, where it
// would put sign-in links into the logs.

const FROM_NAME = { ar: "سُفرة", en: "Sufra" };

export async function sendEmail({ to, replyTo, locale, subject, text, html }) {
  const { SMTP_USER: user, SMTP_PASS: pass } = process.env;

  if (!user || !pass) {
    if (process.env.VERCEL) throw new Error("SMTP_USER and SMTP_PASS must be set to send email");
    console.info(`\n[email] to: ${to}\n[email] subject: ${subject}\n${text}\n[email] end\n`);
    return;
  }

  const message = buildMessage({ from: { name: FROM_NAME[locale], address: user }, to, replyTo, subject, text, html, language: locale });
  await sendMail({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    user,
    pass,
    from: user,
    to,
    message,
  });
}
