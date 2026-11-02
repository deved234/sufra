import { notFound } from "next/navigation";
import { getRestaurants, getRestaurantBySlug } from "@/lib/restaurants";
import OpenStatus from "@/components/open-status";

// Prerender every known restaurant at build time.
// Unknown slugs still reach the page at request time and get a 404 below.
export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((restaurant) => ({ slug: restaurant.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};

  return {
    // absolute skips the root "%s | سُفرة" template: this is the restaurant's site
    title: { absolute: restaurant.name },
    description: restaurant.tagline,
  };
}

const badgeStyles = {
  "الأكثر طلبًا": "bg-brand-soft text-on-brand-soft",
  جديد: "bg-info-soft text-info",
};

export default async function RestaurantPage({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <>
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-16 md:py-24">
          <span className="text-sm font-semibold text-brand-text">
            {restaurant.cuisine} · {restaurant.city}
          </span>
          <h1 className="font-display text-h1 font-extrabold md:text-display">{restaurant.name}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{restaurant.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <OpenStatus opens={restaurant.opens} closes={restaurant.closes} />
            <p className="text-sm text-muted-foreground">{restaurant.hours}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#book"
              className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
            >
              احجز طاولة
            </a>
            <a
              href="#menu"
              className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
            >
              شوف المنيو
            </a>
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto flex w-full max-w-5xl scroll-mt-20 flex-col gap-12 px-6 py-16">
        <h2 className="font-display text-h2 font-extrabold">المنيو</h2>
        {restaurant.menu.map((category) => (
          <div key={category.name} className="flex flex-col gap-4">
            <h3 className="font-display text-h3 font-bold">{category.name}</h3>
            <ul className="grid gap-4 sm:grid-cols-2">
              {category.items.map((item) => (
                <li
                  key={item.name}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold">{item.name}</h4>
                    <span className="shrink-0 font-semibold text-brand-text">{item.price} ر.س</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.badge && (
                    <span className={`self-start rounded-pill px-3 py-1 text-xs font-medium ${badgeStyles[item.badge]}`}>
                      {item.badge}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="book" className="scroll-mt-20 border-t border-border bg-surface-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-16">
          <h2 className="font-display text-h2 font-extrabold">احجز طاولة</h2>
          <p className="max-w-xl text-muted-foreground">
            الحجز أونلاين جاي قريب. لين ذاك الوقت، كلّمنا وإحنا نرتّب لك طاولتك.
          </p>
          <a
            href={`tel:${restaurant.phone.replaceAll(" ", "")}`}
            className="rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover"
          >
            اتصل: <bdi dir="ltr">{restaurant.phone}</bdi>
          </a>
        </div>
      </section>
    </>
  );
}
