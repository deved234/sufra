import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { encodeQr } from "@/lib/qr/encode";
import { qrColor, qrPath, qrSvg, viewSize } from "@/lib/qr/render";
import { SITE_URL } from "@/lib/site-url";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import QrPanel from "@/components/dashboard/qr-panel";

export async function generateMetadata() {
  const t = await getTranslations("Qr");
  return { title: t("title") };
}

export default async function QrPage({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/qr`);
  const restaurant = await getOwnedRestaurant(slug, user);
  if (!restaurant) notFound();
  const locale = await getLocale();

  const color = qrColor(restaurant.accent);
  // The configured address, never the Host header: this ends up printed on tables
  const code = (url) => {
    const { modules } = encodeQr(url);
    return { url, path: qrPath(modules), view: viewSize(modules), svg: qrSvg(modules, color) };
  };

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="qr" />
      <QrPanel
        slug={slug}
        name={restaurant.name}
        color={color}
        published={restaurant.status === undefined || restaurant.status === "published"}
        codes={{ ar: code(`${SITE_URL}/r/${slug}`), en: code(`${SITE_URL}/en/r/${slug}`) }}
      />
    </>
  );
}
