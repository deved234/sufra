import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import { pickMessages } from "@/i18n/messages";
import { googleEnabled } from "@/lib/auth/google";
import { createBooking } from "@/lib/booking/actions";
import { getRestaurants, getRestaurantBySlug } from "@/lib/restaurants";
import BookingFlow from "@/components/booking/booking-flow";
import Skeleton from "@/components/skeleton";

export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((restaurant) => ({ slug: restaurant.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};
  const t = await getTranslations("Booking");
  return { title: { absolute: t("metaTitle", { name: restaurant.name }) }, alternates: await alternatesFor(`/r/${slug}/book`) };
}

export default async function BookPage({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const t = await getTranslations("Booking");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 md:py-14">
      <div>
        <p className="text-sm font-semibold text-brand-text">{restaurant.name}</p>
        <h1 className="font-display text-h2 font-extrabold">{t(restaurant.booking?.enabled ? "title" : "closedTitle")}</h1>
      </div>
      {restaurant.booking?.enabled ? (
        <NextIntlClientProvider messages={await pickMessages(["Booking", "Form", "Auth"])}>
          {/* The choices are in the URL, which a static page only knows in the browser */}
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
            <BookingFlow restaurant={{ slug, phone: restaurant.phone, booking: restaurant.booking, opens: restaurant.opens, closes: restaurant.closes, weeklyHours: restaurant.weeklyHours, exceptions: restaurant.exceptions }} googleEnabled={googleEnabled} action={createBooking.bind(null, slug)} />
          </Suspense>
        </NextIntlClientProvider>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">{t("closedBody")}</p>
          <a href={`tel:${restaurant.phone.replaceAll(" ", "")}`} className="rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover">
            {t("callRestaurant")} <bdi dir="ltr">{restaurant.phone}</bdi>
          </a>
        </div>
      )}
    </section>
  );
}
