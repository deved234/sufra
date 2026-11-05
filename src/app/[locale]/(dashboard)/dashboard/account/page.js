import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getAccountDetails } from "@/lib/account/data";
import { DeleteAccountForm, DevicesForm, EmailForm, PasswordForm, ProfileForm, SetPasswordLink } from "@/components/account/account-forms";

export async function generateMetadata() {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

export default async function AccountPage({ searchParams }) {
  const { emailChanged } = await searchParams;
  const user = await requireUser("/dashboard/account");
  const [account, t] = await Promise.all([getAccountDetails(user.id), getTranslations("Account")]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-h2 font-extrabold">{t("title")}</h1>
      {emailChanged && (
        <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {t("emailChanged")}
        </p>
      )}
      <ProfileForm initial={{ name: account.name, phone: account.phone }} />
      {account.hasPassword ? <PasswordForm /> : <SetPasswordLink />}
      <EmailForm email={account.email} hasPassword={account.hasPassword} googleLinked={account.googleLinked} />
      <DevicesForm />
      <DeleteAccountForm email={account.email} hasPassword={account.hasPassword} ownedCount={account.ownedCount} />
    </div>
  );
}
