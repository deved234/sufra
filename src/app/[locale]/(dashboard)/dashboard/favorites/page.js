import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getFavoriteCards } from "@/lib/account/data";
import RestaurantGrid from "@/components/restaurant-grid";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("favorites") };
}

export default async function FavoritesPage() {
  const user = await requireUser("/dashboard/favorites");
  const [cards, t, bookings] = await Promise.all([getFavoriteCards(user.id), getTranslations("Dashboard"), getTranslations("Bookings")]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-h2 font-extrabold">{t("favorites")}</h1>
      {cards.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-8">
          <p className="max-w-md text-muted-foreground">{t("favoritesEmpty")}</p>
          <Link href="/explore" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {bookings("browseRestaurants")}
          </Link>
        </section>
      ) : (
        <RestaurantGrid restaurants={cards} />
      )}
    </div>
  );
}
