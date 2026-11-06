import { Suspense } from "react";
import { useTranslations } from "next-intl";
import CategoryTabs, { TabsList } from "@/components/menu/category-tabs";
import MenuReveal from "@/components/menu/menu-reveal";
import MenuSection from "@/components/menu/menu-section";

// The whole menu, always the current one: changing a dish needs no publishing.
// In the editor the tabs only show, and nothing animates.
export default function MenuBlock({ block, restaurant, context }) {
  const t = useTranslations("Restaurant");
  const { showTabs = true } = block.props;
  const categories = restaurant.menu.map(({ id, name }) => ({ id, name }));
  const sections = restaurant.menu.map((category, index) => (
    // Only the first two photos load eagerly: they're likely in the first view
    <MenuSection key={category.id} category={category} slug={restaurant.slug} layout={block.variant} preloadCount={index === 0 ? 2 : 0} />
  ));

  return (
    <section id="menu" className="mx-auto flex w-full max-w-5xl scroll-mt-16 flex-col gap-8 px-6 py-16">
      <h2 className="font-display text-h2 font-extrabold">{t("menu")}</h2>
      {showTabs &&
        (context.editing ? (
          <TabsList categories={categories} active="all" />
        ) : (
          // useSearchParams needs a Suspense boundary to keep the page prerendered
          <Suspense fallback={<TabsList categories={categories} active="all" />}>
            <CategoryTabs categories={categories} />
          </Suspense>
        ))}
      {restaurant.menu.length === 0 && <p className="text-muted-foreground">{t("menuEmpty")}</p>}
      {context.editing ? sections : <MenuReveal>{sections}</MenuReveal>}
    </section>
  );
}
