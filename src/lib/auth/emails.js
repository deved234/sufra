import "server-only";
import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/lib/email/send";
import {
  accountExistsEmail,
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingProposalEmail,
  newBookingEmail,
  ownerCancellationEmail,
  proposalAcceptedEmail,
  proposalDeclinedEmail,
  resetEmail,
  verifyEmail,
} from "@/lib/email/templates";
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

// next: where to continue after confirming, such as a booking left halfway
export const sendVerification = logged(async (user, locale, next) => {
  const token = await issueEmailToken({ userId: user._id, email: user.email, purpose: "verify" });
  const url = link(`/confirm-email?token=${token}${next ? `&next=${encodeURIComponent(next)}` : ""}`, locale);
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

// Owners read in Arabic, the site's main language. Customers read in the language
// they booked in.
const OWNER_LOCALE = "ar";

async function ownerEmails(restaurant) {
  const owners = await getDb()
    .collection(USERS)
    .find({ _id: { $in: restaurant.ownerIds ?? [] } }, { projection: { email: 1 } })
    .toArray();
  return owners.map((owner) => owner.email);
}

const bookingLink = (booking) => link(`/dashboard/bookings/${booking._id}`, booking.locale);
const boardLink = (booking, restaurant) => link(`/dashboard/${restaurant.slug}/bookings?date=${booking.date}`, OWNER_LOCALE);

export const sendBookingConfirmed = logged(async (booking, restaurant) => {
  const { locale } = booking;
  await deliver(booking.email, locale, bookingConfirmedEmail({ locale, booking, restaurantName: restaurant.name[locale], url: bookingLink(booking) }));
});

export const sendBookingCancelled = logged(async (booking, restaurant) => {
  const { locale } = booking;
  await deliver(booking.email, locale, bookingCancelledEmail({ locale, booking, restaurantName: restaurant.name[locale], url: link(`/r/${restaurant.slug}/book`, locale) }));
});

export const sendNewBookingToOwners = logged(async (booking, restaurant) => {
  const email = newBookingEmail({ locale: OWNER_LOCALE, booking, restaurantName: restaurant.name[OWNER_LOCALE], url: boardLink(booking, restaurant) });
  for (const to of await ownerEmails(restaurant)) await deliver(to, OWNER_LOCALE, email);
});

export const sendOwnerCancellationNotice = logged(async (booking, restaurant) => {
  const email = ownerCancellationEmail({ locale: OWNER_LOCALE, booking, restaurantName: restaurant.name[OWNER_LOCALE], url: boardLink(booking, restaurant) });
  for (const to of await ownerEmails(restaurant)) await deliver(to, OWNER_LOCALE, email);
});

// The owner asks to change a booking: the email shows the new time and the reason
export const sendBookingProposal = logged(async (booking, proposal, restaurant) => {
  if (!booking.email) return;
  const { locale } = booking;
  const email = bookingProposalEmail({
    locale,
    booking: { ...booking, ...proposal },
    restaurantName: restaurant.name[locale],
    url: bookingLink(booking),
    reason: proposal.reason,
  });
  await deliver(booking.email, locale, email);
});

export const sendProposalDecision = logged(async (booking, proposal, restaurant, accepted) => {
  const build = accepted ? proposalAcceptedEmail : proposalDeclinedEmail;
  const email = build({
    locale: OWNER_LOCALE,
    booking: { ...booking, ...proposal },
    restaurantName: restaurant.name[OWNER_LOCALE],
    url: boardLink({ ...booking, date: accepted ? proposal.date : booking.date }, restaurant),
  });
  for (const to of await ownerEmails(restaurant)) await deliver(to, OWNER_LOCALE, email);
});
