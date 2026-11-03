import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import RestaurantNav from "@/components/dashboard/restaurant-nav";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("overview") };
}

export default async function RestaurantOverview({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}`);
  const restaurant = await getOwnedRestaurant(slug, user.id);
  if (!restaurant) notFound();

  const [t, menu, locale] = await Promise.all([getTranslations("Dashboard"), getTranslations("Menu"), getLocale()]);

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="overview" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("sections.look")}>
          <span className="flex items-center gap-2" dir="ltr">
            <span aria-hidden className="size-5 rounded-pill" style={{ backgroundColor: restaurant.accent }} />
            {restaurant.accent}
          </span>
        </Stat>
        <Stat label={t("categories", { count: restaurant.categoryCount })}>
          {menu("dishCount", { count: restaurant.dishCount })}
        </Stat>
        <Stat label={t("fields.slug")}>
          <span dir="ltr">/r/{slug}</span>
        </Stat>
      </div>
      <Link
        href={`/dashboard/${slug}/menu`}
        className="mt-6 inline-block rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
      >
        {t("editMenu")}
      </Link>
    </>
  );
}

function Stat({ label, children }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}
