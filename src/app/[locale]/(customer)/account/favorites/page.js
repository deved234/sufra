import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getFavoriteCards, getFavoriteDishGroups } from "@/lib/account/data";
import { formatPrice } from "@/lib/format";
import FavoriteButton from "@/components/favorite-button";
import RestaurantGrid from "@/components/restaurant-grid";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("favorites") };
}

// Saved restaurants and saved dishes, each on its own tab. The tab is in the URL, so
// Back and a refresh keep it.
export default async function FavoritesPage({ searchParams }) {
  const { tab } = await searchParams;
  const user = await requireUser("/account/favorites");
  const locale = await getLocale();
  const [cards, groups, t, bookings] = await Promise.all([getFavoriteCards(user.id), getFavoriteDishGroups(user.id, locale), getTranslations("Dashboard"), getTranslations("Bookings")]);
  const showDishes = tab === "dishes";
  const dishCount = groups.reduce((sum, group) => sum + group.dishes.length, 0);

  const empty = (message) => (
    <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-8">
      <p className="max-w-md text-muted-foreground">{message}</p>
      <Link href="/explore" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
        {bookings("browseRestaurants")}
      </Link>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-h2 font-extrabold">{t("favorites")}</h1>
      <nav aria-label={t("favorites")} className="flex gap-1 border-b border-border">
        <Tab href="/account/favorites" active={!showDishes} label={t("favoriteRestaurants")} count={cards.length} />
        <Tab href={{ pathname: "/account/favorites", query: { tab: "dishes" } }} active={showDishes} label={t("favoriteDishes")} count={dishCount} />
      </nav>

      {!showDishes ? (
        cards.length === 0 ? empty(t("favoritesEmpty")) : <RestaurantGrid restaurants={cards} favorite />
      ) : groups.length === 0 ? (
        empty(t("favoriteDishesEmpty"))
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ slug, name, dishes }) => (
            <section key={slug} className="flex flex-col gap-3">
              <h2 className="font-display text-h3 font-bold">
                <Link href={`/r/${slug}`} className="hover:underline">
                  {name}
                </Link>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {dishes.map((dish) => (
                  <li key={dish.id} className="relative">
                    <Link href={`/r/${slug}/dish/${dish.id}`} className="flex h-full gap-3 overflow-hidden rounded-lg border border-border bg-surface p-3 pe-14 shadow-sm transition-shadow duration-150 hover:shadow-md">
                      {dish.image && (
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                          <Image src={dish.image} alt="" fill sizes="80px" placeholder="blur" className={`object-cover ${dish.available ? "" : "opacity-60 grayscale"}`} />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="font-semibold">{dish.name}</h3>
                        <p className="font-semibold text-brand-text">{formatPrice(dish.price, locale)}</p>
                        {!dish.available && <p className="text-sm text-danger">{t("soldOut")}</p>}
                      </div>
                    </Link>
                    <FavoriteButton slug={slug} dishId={dish.id} initialOn className="absolute end-3 top-3" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({ href, active, label, count }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label} <span className="opacity-70">{count}</span>
    </Link>
  );
}
