"use server";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/dal";
import { clientIp, hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { createDemoAccount } from "@/lib/demo/create";

// "Try the dashboard without an account". The account is signed in at once, with no
// password, and only ever works on its own sample restaurant.
export async function startDemo(_previous, formData) {
  const value = formData.get("locale");
  const locale = routing.locales.includes(value) ? value : routing.defaultLocale;

  // Someone already signed in keeps their session, rather than losing it to a demo
  const current = await getCurrentUser();
  if (current) redirect({ href: current.demo ? "/dashboard" : "/start", locale });

  const limits = [
    [`demo:ip:${await clientIp()}`, LIMITS.demoIp],
    ["demo:all", LIMITS.demoAll],
  ];
  for (const [key, limit] of limits) {
    if (await isLimited(key, limit)) return { error: "demoLimited" };
  }
  await Promise.all(limits.map(([key, limit]) => hit(key, limit)));

  let account;
  try {
    account = await createDemoAccount({ locale });
    await createSession(account.userId);
  } catch (error) {
    console.error("[demo] failed:", error);
    return { error: "generic" };
  }
  redirect({ href: `/dashboard/${account.slug}`, locale });
}
