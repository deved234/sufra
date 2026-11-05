import { notFound } from "next/navigation";
import { getDish, getDishParams } from "@/lib/restaurants";
import DishDetails from "@/components/dish-details";
import DishModal from "@/components/dish-modal";

// Intercepts /r/[slug]/dish/[dishId] when navigating from inside the restaurant
// site: the dish renders in the @modal slot over the page instead of replacing it.
// (.) matches the "dish" segment on the same level; @modal is a slot, not a segment.

// Every known dish is prerendered; an unknown one waits for the full render so it
// can answer 404 (like the restaurant layout). Tells dev validation that's intended.
export const instant = false;

export async function generateStaticParams() {
  return getDishParams();
}

// The tab title follows the open dish, as on the full page
export async function generateMetadata({ params }) {
  const { slug, dishId } = await params;
  const found = await getDish(slug, dishId);
  if (!found) return {};
  return { title: { absolute: `${found.dish.name} | ${found.restaurant.name}` } };
}

export default async function DishModalPage({ params }) {
  const { slug, dishId } = await params;
  const found = await getDish(slug, dishId);
  if (!found) notFound();

  return (
    <DishModal labelledBy="dish-modal-title">
      <DishDetails slug={slug}
        dish={found.dish}
        category={found.category}
        as="h2"
        headingId="dish-modal-title"
        sizes="(min-width: 640px) 576px, 100vw"
        preload
      />
    </DishModal>
  );
}
