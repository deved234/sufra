import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import { ownsRestaurant } from "@/lib/auth/home-path";
import AccountDropdown from "@/components/account-dropdown";

const ITEM = "block w-full rounded-md px-3 py-2 text-start text-sm font-medium transition-colors duration-150 hover:bg-surface-muted";

// The signed-in user's menu, the same in every frame. It offers only what this account
// has. Signing out is a plain form posting to a Server Action, so it works before any
// JavaScript loads.
export default async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [t, locale, isOwner] = await Promise.all([getTranslations("Auth"), getLocale(), ownsRestaurant(user.id)]);

  return (
    <AccountDropdown
      label={t("accountMenu")}
      trigger={
        <>
          <span aria-hidden className="flex size-6 items-center justify-center rounded-pill bg-brand-soft text-xs font-bold text-on-brand-soft">
            {user.name.charAt(0)}
          </span>
          <span className="hidden max-w-28 truncate md:block">{user.name}</span>
        </>
      }
    >
      <div className="border-b border-border px-3 pb-2 pt-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p dir="ltr" className="truncate text-end text-xs text-muted-foreground rtl:text-start">
          {user.email}
        </p>
      </div>
      <Link href="/account" className={ITEM}>
        {t("menuAccount")}
      </Link>
      {isOwner && (
        <Link href="/dashboard" className={ITEM}>
          {t("menuRestaurants")}
        </Link>
      )}
      {user.role === "admin" && (
        <Link href="/admin" className={ITEM}>
          {t("adminPanel")}
        </Link>
      )}
      <form action={signOut} className="border-t border-border pt-1">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={ITEM}>
          {t("signOut")}
        </button>
      </form>
    </AccountDropdown>
  );
}
