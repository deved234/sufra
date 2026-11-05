import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { createRestaurant } from "@/lib/dashboard/actions";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import RestaurantForm from "@/components/dashboard/restaurant-form";

const blank = { ar: "", en: "" };
const DEFAULTS = {
  name: blank,
  slug: "",
  tagline: blank,
  cuisine: blank,
  city: blank,
  address: blank,
  phone: "+966 ",
  opens: "12:00",
  closes: "23:00",
  accent: "#C8553D",
};

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("createTitle") };
}

export default async function NewRestaurantPage() {
  await requireUser("/dashboard/new");
  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-h2 font-extrabold">{t("createTitle")}</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">{t("createLead")}</p>
      </div>
      <RestaurantForm
        mode="create"
        action={createRestaurant}
        initial={DEFAULTS}
        initialThemeStyle={themeStyle(buildRestaurantTheme(DEFAULTS.accent))}
      />
    </div>
  );
}
