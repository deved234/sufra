import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { updateRestaurant } from "@/lib/dashboard/actions";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import RestaurantForm from "@/components/dashboard/restaurant-form";
import BookingSettingsForm from "@/components/dashboard/booking-settings-form";
import { saveBookingSettings } from "@/lib/booking/actions";
import { DEFAULT_BOOKING } from "@/lib/booking-slots";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("settingsTitle") };
}

export default async function RestaurantSettings({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/settings`);
  const restaurant = await getOwnedRestaurant(slug, user.id);
  if (!restaurant) notFound();

  // The form only needs the editable fields
  const { menu, categoryCount, dishCount, booking, ...initial } = restaurant;
  const locale = await getLocale();

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="settings" />
      <RestaurantForm
        mode="edit"
        // The slug is bound here, but the client sends it back: the action still checks the owner
        action={updateRestaurant.bind(null, slug)}
        initial={initial}
        initialThemeStyle={themeStyle(buildRestaurantTheme(restaurant.accent))}
      />
      <div className="mt-8">
        <BookingSettingsForm action={saveBookingSettings.bind(null, slug)} initial={booking ?? DEFAULT_BOOKING} />
      </div>
    </>
  );
}
