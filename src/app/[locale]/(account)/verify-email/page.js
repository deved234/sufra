import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import AuthCard from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/auth-forms";
import Skeleton from "@/components/skeleton";

// Where new accounts land, and where private pages send accounts that haven't
// confirmed their email yet
export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaVerify"), robots: { index: false } };
}

export default function VerifyEmailPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("verifyTitle")} lead={t("verifyLead")}>
      {/* Who is asking is only known from the session cookie, at request time */}
      <Suspense fallback={<Skeleton className="h-28 w-full" />}>
        <VerifyStatus />
      </Suspense>
    </AuthCard>
  );
}

async function VerifyStatus() {
  const [user, t, locale] = await Promise.all([getCurrentUser(), getTranslations("Auth"), getLocale()]);
  if (user?.verified) redirect({ href: "/start", locale });

  // Just signed up (no session until the link is opened), or signed out
  if (!user) {
    return (
      <Link href="/sign-in" className="text-sm font-semibold text-brand-text hover:underline">
        {t("verifyNoSession")}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-sm">
        <p>
          {t.rich("verifySentTo", {
            email: user.email,
            // An address inside Arabic text keeps its own left-to-right order
            b: (chunks) => (
              <bdi dir="ltr" className="font-semibold">
                {chunks}
              </bdi>
            ),
          })}
        </p>
        <p className="text-muted-foreground">{t("verifyHint")}</p>
      </div>
      <ResendVerificationForm />
      <form action={signOut} className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
        <input type="hidden" name="locale" value={locale} />
        {t("notYou")}
        <button type="submit" className="font-semibold text-brand-text hover:underline">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
