import "server-only";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { accountExistsEmail, resetEmail, verifyEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site-url";

// The account emails. They run after the response is sent (next/server `after`),
// so a slow mail server never holds up the page, and the answer looks and takes the
// same whatever happens here. Failures are logged, never shown.

// Links always use the configured site address. Building them from the request's
// Host header would let anyone ask for a reset link pointing at their own domain
// ("password reset poisoning").
const link = (path, locale) => `${SITE_URL}${locale === "ar" ? "" : `/${locale}`}${path}`;

async function deliver(to, locale, email) {
  const key = `mail:to:${to}`;
  if (await isLimited(key, LIMITS.mailTo)) {
    console.warn(`[email] skipped "${email.subject}": too many emails to this inbox`);
    return;
  }
  await hit(key, LIMITS.mailTo);
  await sendEmail({ to, locale, ...email });
}

const logged = (job) => async (...args) => {
  try {
    await job(...args);
  } catch (error) {
    console.error("[email] failed:", error);
  }
};

export const sendVerification = logged(async (user, locale) => {
  const token = await issueEmailToken({ userId: user._id, email: user.email, purpose: "verify" });
  const url = link(`/confirm-email?token=${token}`, locale);
  await deliver(user.email, locale, verifyEmail({ locale, name: user.name, url }));
});

export const sendPasswordReset = logged(async (user, locale) => {
  const token = await issueEmailToken({ userId: user._id, email: user.email, purpose: "reset" });
  const url = link(`/reset-password?token=${token}`, locale);
  await deliver(user.email, locale, resetEmail({ locale, url }));
});

export const sendAccountExists = logged(async (email, locale) => {
  const signInUrl = link("/sign-in", locale);
  const resetUrl = link("/forgot-password", locale);
  await deliver(email, locale, accountExistsEmail({ locale, signInUrl, resetUrl }));
});
