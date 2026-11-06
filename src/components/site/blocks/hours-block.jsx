import { useTranslations } from "next-intl";
import RestaurantSchedule from "@/components/restaurant-schedule";
import { scheduleOf } from "@/components/site/blocks/block-helpers";

export default function HoursBlock({ block, restaurant }) {
  const t = useTranslations("Restaurant");
  return (
    <section id="hours" className="mx-auto flex w-full max-w-5xl scroll-mt-20 flex-col gap-6 px-6 pb-16">
      <h2 className="font-display text-h2 font-extrabold">{t("hoursTitle")}</h2>
      <RestaurantSchedule schedule={scheduleOf(restaurant)} layout={block.variant} />
    </section>
  );
}
