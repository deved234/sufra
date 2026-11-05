import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";

// The signed-in user and a sign-out button: a plain form posting to a Server
// Action, so it works before any JavaScript loads
export default async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [t, locale] = await Promise.all([getTranslations("Auth"), getLocale()]);

  return (
    <form action={signOut} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      {user.role === "admin" && (
        // No room in a phone's header: phones get it on the dashboard home instead
        <Link href="/admin" className="hidden whitespace-nowrap rounded-pill bg-brand-soft px-3 py-2 text-sm font-bold text-on-brand-soft sm:block">
          {t("adminPanel")}
        </Link>
      )}
      <span className="hidden max-w-32 truncate text-sm text-muted-foreground md:block">{user.name}</span>
      <button
        type="submit"
        className="whitespace-nowrap rounded-pill border border-border-strong px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm transition-colors duration-150 hover:bg-surface-muted"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
